import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/register-company
 *
 * Proxy hacia backend-saas:8000/auth/register-company
 * El frontend NO accede a Prisma directamente (enforced by prisma.ts stub).
 * Esta ruta simplemente reenvía la solicitud al backend-saas.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, companyName, website } = body;

    // Validación básica en frontend
    if (!firstName || !lastName || !companyName || !email || !password) {
      return NextResponse.json(
        {
          error:
            "Datos incompletos: firstName, lastName, email, password, companyName son requeridos",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }

    // Reenviar al backend-saas
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_SAAS_API_URL || "http://localhost:8000";

    const response = await fetch(`${BACKEND_URL}/auth/register-company`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        password,
        companyName,
        website: website || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.warn("Backend-saas register-company failed", {
        status: response.status,
        error: data.detail || data.error,
      });
      return NextResponse.json(
        { error: data.detail || data.error || "Error al registrar la empresa" },
        { status: response.status },
      );
    }

    logger.info("Company registered successfully", {
      email: data.email,
      company_id: data.company_id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Empresa registrada con éxito",
        email: data.email,
        company_name: data.company_name,
        company_id: data.company_id,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error in register-company proxy", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error interno al registrar la empresa" },
      { status: 500 },
    );
  }
}
