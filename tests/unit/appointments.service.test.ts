import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentStatus, AppointmentType, PipelineStatus } from "@prisma/client";
import { getTenantPrisma } from "@/lib/prisma";
import { LeadPipelineService } from "@/lib/leads/pipeline/pipeline.service";
import { AppointmentsService } from "@/lib/appointments/appointments.service";

const sendEmailMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: sendEmailMock,
    },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  getTenantPrisma: vi.fn(),
}));

vi.mock("@/lib/leads/pipeline/pipeline.service", () => ({
  LeadPipelineService: {
    advancePipeline: vi.fn(),
  },
}));

const createMock = vi.fn();
const deleteMock = vi.fn();
const findFirstMock = vi.fn();
const updateMock = vi.fn();
const findManyMock = vi.fn();

describe("AppointmentsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.SMTP_FROM_EMAIL = "ops@example.com";

    vi.mocked(getTenantPrisma).mockReturnValue({
      appointment: {
        create: createMock,
        delete: deleteMock,
        findFirst: findFirstMock,
        update: updateMock,
        findMany: findManyMock,
      },
    } as unknown as ReturnType<typeof getTenantPrisma>);
  });

  it("Crear cita -> avanza lead a CITADO", async () => {
    createMock.mockResolvedValueOnce({
      id: "appt-1",
      leadId: "lead-1",
      tenantId: "tenant-a",
      scheduledAt: new Date("2026-03-10T13:00:00.000Z"),
      duration: 30,
      type: AppointmentType.CALL,
      status: AppointmentStatus.PENDING,
    });
    vi.mocked(LeadPipelineService.advancePipeline).mockResolvedValueOnce({ id: "lead-1" } as never);

    const appointment = await AppointmentsService.createAppointment({
      tenantId: "tenant-a",
      leadId: "lead-1",
      scheduledAt: "2026-03-10T13:00:00.000Z",
      duration: 30,
      type: AppointmentType.CALL,
    });

    expect(appointment.id).toBe("appt-1");
    expect(LeadPipelineService.advancePipeline).toHaveBeenCalledWith(
      "tenant-a",
      "lead-1",
      PipelineStatus.CITADO,
      expect.objectContaining({
        appointmentId: "appt-1",
      }),
    );
  });

  it("Completar cita -> avanza lead a LLAMADO", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "appt-2",
      leadId: "lead-2",
    });
    vi.mocked(LeadPipelineService.advancePipeline).mockResolvedValueOnce({ id: "lead-2" } as never);
    updateMock.mockResolvedValueOnce({
      id: "appt-2",
      status: AppointmentStatus.COMPLETED,
      outcome: "Call done",
    });

    const appointment = await AppointmentsService.completeAppointment(
      "tenant-a",
      "appt-2",
      "Call done",
    );

    expect(LeadPipelineService.advancePipeline).toHaveBeenCalledWith(
      "tenant-a",
      "lead-2",
      PipelineStatus.LLAMADO,
      expect.objectContaining({
        appointmentId: "appt-2",
      }),
    );
    expect(appointment.status).toBe(AppointmentStatus.COMPLETED);
  });

  it("Reminder enviado -> Resend llamado con template correcto", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "appt-3",
      duration: 45,
      scheduledAt: new Date("2026-03-10T13:00:00.000Z"),
      lead: {
        name: "Lucía",
        companyName: "Delta SA",
        email: "lucia@delta.com",
      },
    });
    sendEmailMock.mockResolvedValueOnce({ data: { id: "email-123" }, error: null });

    const result = await AppointmentsService.sendReminder("tenant-a", "appt-3");

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "lucia@delta.com",
        subject: expect.stringContaining("Recordatorio de llamada"),
        html: expect.stringContaining("Duración estimada: 45 minutos."),
      }),
    );
    expect(result.messageId).toBe("email-123");
  });
});
