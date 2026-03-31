/**
 * lib/api/appointments.ts
 * API functions for Appointment resource — delegates to backend-saas:8000
 */

import { saasClient } from "./api-client";

export interface AppointmentApiRecord {
  id: string;
  tenantId: string;
  leadId: string;
  scheduledAt: string;
  duration?: number;
  type?: string;
  notes?: string | null;
  status?: string;
  outcome?: string | null;
  lead?: {
    id: string;
    name?: string | null;
    companyName?: string | null;
    email?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

export async function getAppointments(
  tenantId: string,
  filter?: "upcoming" | "today" | "all",
): Promise<AppointmentApiRecord[]> {
  const params = new URLSearchParams({ tenantId });
  if (filter) params.set("filter", filter);
  const result = await saasClient.get<{ appointments: AppointmentApiRecord[] }>(
    `/appointments?${params}`,
  );
  return result.success ? (result.data?.appointments ?? []) : [];
}

export async function createAppointment(
  data: Partial<AppointmentApiRecord>,
): Promise<AppointmentApiRecord | null> {
  const result = await saasClient.post<AppointmentApiRecord>("/appointments", data);
  return result.success ? (result.data ?? null) : null;
}

export async function updateAppointment(
  appointmentId: string,
  data: Partial<AppointmentApiRecord>,
): Promise<AppointmentApiRecord | null> {
  const result = await saasClient.put<AppointmentApiRecord>(
    `/appointments/${appointmentId}`,
    data,
  );
  return result.success ? (result.data ?? null) : null;
}

export async function completeAppointment(
  tenantId: string,
  appointmentId: string,
  outcome: string,
): Promise<AppointmentApiRecord | null> {
  const result = await saasClient.post<AppointmentApiRecord>(
    `/appointments/${appointmentId}/complete`,
    { tenantId, outcome },
  );
  return result.success ? (result.data ?? null) : null;
}

export async function sendAppointmentReminder(
  tenantId: string,
  appointmentId: string,
): Promise<{ appointmentId: string; messageId: string | null } | null> {
  const result = await saasClient.post<{ appointmentId: string; messageId: string | null }>(
    `/appointments/${appointmentId}/reminder`,
    { tenantId },
  );
  return result.success ? (result.data ?? null) : null;
}
