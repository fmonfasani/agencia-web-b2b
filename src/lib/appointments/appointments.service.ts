import { AppointmentStatus, AppointmentType, PipelineStatus } from "@prisma/client";
import { Resend } from "resend";
import { getTenantPrisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import { LeadPipelineService } from "@/lib/leads/pipeline/pipeline.service";

function getResendClient(): Resend | null {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

export interface CreateAppointmentInput {
  tenantId: string;
  leadId: string;
  scheduledAt: Date | string;
  duration?: number;
  type?: AppointmentType;
  notes?: string;
}

export const AppointmentsService = {
  async createAppointment(input: CreateAppointmentInput) {
    const tenantId = requireTenantId(input.tenantId);
    const tPrisma = getTenantPrisma(tenantId);

    const scheduledAt = input.scheduledAt instanceof Date
      ? input.scheduledAt
      : new Date(input.scheduledAt);

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new Error("Invalid scheduledAt date.");
    }

    const appointment = await tPrisma.appointment.create({
      data: {
        leadId: input.leadId,
        scheduledAt,
        duration: input.duration ?? 30,
        type: input.type ?? AppointmentType.CALL,
        notes: input.notes ?? null,
      },
    });

    try {
      await LeadPipelineService.advancePipeline(
        tenantId,
        input.leadId,
        PipelineStatus.CITADO,
        {
          appointmentId: appointment.id,
          reason: "appointment_created",
        },
      );
    } catch (error) {
      await tPrisma.appointment.delete({ where: { id: appointment.id } });
      throw error;
    }

    return appointment;
  },

  async completeAppointment(tenantId: string, id: string, outcome: string) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);

    const appointment = await tPrisma.appointment.findFirst({
      where: { id },
      select: { id: true, leadId: true },
    });

    if (!appointment) {
      throw new Error(`Appointment ${id} not found for tenant ${activeTenantId}.`);
    }

    await LeadPipelineService.advancePipeline(
      activeTenantId,
      appointment.leadId,
      PipelineStatus.LLAMADO,
      {
        appointmentId: appointment.id,
        reason: "appointment_completed",
      },
    );

    return tPrisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.COMPLETED,
        outcome,
      },
    });
  },

  async getUpcoming(tenantId: string) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    return tPrisma.appointment.findMany({
      where: {
        scheduledAt: { gte: now, lte: in48h },
        status: {
          in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.RESCHEDULED,
          ],
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
  },

  async sendReminder(tenantId: string, appointmentId: string) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);

    const appointment = await tPrisma.appointment.findFirst({
      where: { id: appointmentId },
      include: {
        lead: {
          select: {
            name: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found for tenant ${activeTenantId}.`);
    }
    if (!appointment.lead.email) {
      throw new Error("Lead has no email for reminder.");
    }
    const resend = getResendClient();
    if (!resend) {
      throw new Error("Resend API Key missing.");
    }

    const fromEmail = process.env.SMTP_FROM_EMAIL || "no-reply@agencialeads.com";
    const dateLabel = appointment.scheduledAt.toLocaleString("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const company = appointment.lead.companyName ?? appointment.lead.name ?? "tu empresa";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: appointment.lead.email,
      subject: `Recordatorio de llamada - ${company}`,
      html: `<div style="font-family: sans-serif">
        <h2>Recordatorio de cita</h2>
        <p>Tu llamada está agendada para <strong>${dateLabel}</strong>.</p>
        <p>Duración estimada: ${appointment.duration} minutos.</p>
      </div>`,
    });

    if (error) {
      throw new Error(error.message || "Failed to send reminder email.");
    }

    return { appointmentId, messageId: data?.id ?? null };
  },
};
