import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
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
      const lead = await prisma.lead.create({
        data: {
          name,
          email,
          message,
          company: company || null,
          budget: budget || null,
          source: "contact_form",
          status: "NEW", // Explicit default, though schema has it too
        },
      });

      console.log("Nuevo lead creado:", lead.id);

      // Aquí iría el envío de email (Resend/NodeMailer)
      // await sendNotificationEmail(lead);

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
