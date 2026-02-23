import nodemailer from "nodemailer";
import { Resend } from "resend";

// Configuración de Resend (Prioritario si existe API Key)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Configuración de SMTP (Fallback o Alternativa)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendInvitationEmail({
  to,
  tenantName,
  inviteUrl,
  role,
}: {
  to: string;
  tenantName: string;
  inviteUrl: string;
  role: string;
}) {
  const fromName = process.env.SMTP_FROM_NAME || "Revenue OS";
  const fromEmail = process.env.SMTP_FROM_EMAIL || "no-reply@agencialeads.com";

  // 1. Intentar con Resend si está configurado
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Invitación Prioritaria: Revenue OS - ${tenantName}`,
        html: generateInviteTemplate(tenantName, role, inviteUrl),
      });

      if (error) {
        console.error("❌ ERROR RESEND:", error);
        // No retornamos aquí, intentamos fallback si hay SMTP
      } else {
        console.log("✅ Email enviado vía Resend:", data?.id);
        return { success: true, data };
      }
    } catch (err) {
      console.error("❌ EXCEPCIÓN RESEND:", err);
    }
  }

  // 2. Fallback a Nodemailer (SMTP)
  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `Invitación Prioritaria: Revenue OS - ${tenantName}`,
      html: generateInviteTemplate(tenantName, role, inviteUrl),
    });

    console.log("✅ Email enviado vía SMTP:", info.messageId);
    return { success: true, data: info };
  } catch (err) {
    console.error("❌ ERROR NODEMAILER (FALLBACK):", err);
    return { success: false, error: err };
  }
}

function generateInviteTemplate(
  tenantName: string,
  role: string,
  inviteUrl: string,
) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 20px;">
      <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; letter-spacing: -0.025em; margin-bottom: 8px;">Revenue OS</h1>
      <p style="color: #64748b; font-size: 14px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 24px;">Security Gateway</p>
      
      <p style="color: #334155; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
        Has sido invitado a unirte al perímetro de seguridad de <strong>${tenantName}</strong> con el rol de <strong>${role}</strong>.
      </p>
      
      <div style="background-color: #f8fafc; padding: 24px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
        <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 800; margin-bottom: 8px;">Acceso Unificado</p>
        <a href="${inviteUrl}" style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase;">Aceptar Invitación</a>
      </div>
      
      <p style="color: #94a3b8; font-size: 12px;">
        Esta invitación expira en 7 días. Si no esperabas esto, puedes ignorar el correo.
      </p>
    </div>
  `;
}
