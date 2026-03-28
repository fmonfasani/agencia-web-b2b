import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/authz";
import { requireAuth } from "@/lib/auth/request-auth";
import { createLeadForTenant, listLeadsByTenant } from "@/lib/lead-repository";
import { resolveTenantIdFromHeaders } from "@/lib/tenant-context";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const activeTenantId = resolveTenantIdFromHeaders(
      new Headers(request.headers),
      auth.session.tenantId || process.env.DEFAULT_TENANT_ID,
    );

    const leads = await listLeadsByTenant(activeTenantId);

    return NextResponse.json({ leads });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = await checkRateLimit(`contact:${ip}`, 8, 60);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  try {
    const body = await request.json();
    const { name, email, message, company, budget } = body;

    // Validación básica
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Todos los campos obligatorios son requeridos" },
        { status: 400 },
      );
    }

    try {
      // Guardar en Base de Datos
      const activeTenantId = resolveTenantIdFromHeaders(
        new Headers(request.headers),
        process.env.DEFAULT_TENANT_ID,
      );

      const lead = await createLeadForTenant({
        tenantId: activeTenantId,
        name,
        email,
        message,
        companyName: company || null,
        budget: budget || null,
        source: "contact_form",
        status: "NEW",
      });

      console.log("Nuevo lead creado:", lead.id);

      return NextResponse.json(
        {
          success: true,
          message: "Consulta enviada con éxito",
          leadId: lead.id,
        },
        { status: 200 },
      );
    } catch (dbError) {
      console.error("Error de base de datos:", dbError);
      return NextResponse.json(
        { error: "Error al guardar tu consulta. Por favor intenta más tarde." },
        { status: 503 }, // Service Unavailable
      );
    }
  } catch (error) {
    console.error("Error general en API:", error);
    return NextResponse.json(
      { error: "Hubo un error al procesar tu solicitud" },
      { status: 500 },
    );
  }
}
