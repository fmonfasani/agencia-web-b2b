import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validación básica
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 },
      );
    }

    // Aquí iría la integración real (Resend, SendGrid, etc.)
    // Por ahora simulamos éxito y logueamos en servidor
    console.log("Nueva consulta recibida:", { name, email, message });

    // Simulamos un leve retraso de red
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return NextResponse.json(
      { success: true, message: "Consulta enviada con éxito" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error en API de contacto:", error);
    return NextResponse.json(
      { error: "Hubo un error al procesar tu solicitud" },
      { status: 500 },
    );
  }
}
