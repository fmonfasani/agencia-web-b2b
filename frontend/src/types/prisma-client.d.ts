/**
 * prisma-client.d.ts — Shim de tipos para arquitectura SPA
 *
 * @prisma/client fue eliminado del frontend (no hay acceso directo a DB).
 * Este archivo declara los tipos para que los archivos legacy compilen
 * mientras se migran a la API de backend-saas.
 */
declare module "@prisma/client" {
  export type Role =
    | "SUPER_ADMIN"
    | "ADMIN"
    | "ANALISTA"
    | "CLIENTE"
    | "MEMBER"
    | "VIEWER";

  export const Role: Record<Role, Role>;

  export type PipelineStatus =
    | "NUEVO"
    | "ENRIQUECIDO"
    | "SCORED"
    | "INVESTIGADO"
    | "CITADO"
    | "LLAMADO"
    | "PROPUESTA_ENVIADA"
    | "CERRADO_GANADO"
    | "CERRADO_PERDIDO"
    | "DESCARTADO"
    | "ELEGIDO"
    | "ENTREVISTA"
    | "CALIFICADO";

  export const PipelineStatus: Record<PipelineStatus, PipelineStatus>;

  export type DealStage =
    | "PROSPECTING"
    | "QUALIFIED"
    | "PROPOSAL"
    | "NEGOTIATION"
    | "CLOSED_WON"
    | "CLOSED_LOST";

  export const DealStage: Record<DealStage, DealStage>;

  export type AppointmentStatus =
    | "PENDING"
    | "CONFIRMED"
    | "COMPLETED"
    | "CANCELLED"
    | "RESCHEDULED";

  export const AppointmentStatus: Record<AppointmentStatus, AppointmentStatus>;

  export type AppointmentType = "CALL" | string;
  export const AppointmentType: Record<string, string>;

  export type AuditEventType = "ADMIN_ACTION" | string;
  export const AuditEventType: Record<string, string>;

  export type AgentChannel = string;
  export const AgentChannel: Record<string, string>;

  export type AgentType = string;
  export const AgentType: Record<string, string>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Lead = Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Deal = Record<string, any>;

  export namespace Prisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type JsonValue = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type InputJsonValue = any;
    export type SortOrder = "asc" | "desc";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type LeadWhereInput = Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type LeadUpdateInput = Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type DealCreateInput = Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type DealUpdateInput = Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type TransactionClient = any;
  }

  export class PrismaClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
    constructor(options?: Record<string, unknown>);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction(fn: (tx: any) => Promise<any>): Promise<any>;
  }
}
