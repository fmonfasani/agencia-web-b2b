// Environment audit script
import "dotenv/config";

const REQUIRED_ENV_VARS = [
    // Base de datos (Prisma)
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL",

    // Auth & Next.js
    "NEXTAUTH_SECRET",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",

    // Bridge & Seguridad Interna
    "INTERNAL_API_SECRET",
    "BRIDGE_API_KEY",
    "NEXTJS_INTERNAL_AUTH_URL",
    "AGENT_SERVICE_URL",

    // AI & Scraper
    "OPENAI_API_KEY",
    "FIRECRAWL_API_KEY",
    "APIFY_API_TOKEN",

    // Email & Communication
    "RESEND_API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_NUMBER",

    // Redis / Rate Limiting
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",

    // Monitoring
    "SENTRY_DSN",
    "NEXT_PUBLIC_VERCEL_ANALYTICS_ID",
];

function verify() {
    console.log("🚀 Iniciando auditoría de variables de entorno para Producción...\n");

    let missing = 0;

    REQUIRED_ENV_VARS.forEach((envVar) => {
        let value = process.env[envVar];
        
        // Auth v5 compatibility: allow AUTH_SECRET as alias for NEXTAUTH_SECRET
        if (!value && envVar === "NEXTAUTH_SECRET") {
            value = process.env.AUTH_SECRET;
        }

        if (!value) {
            console.error(`❌ ERROR: Falta la variable [${envVar}]`);
            missing++;
        } else {
            console.log(`✅ ${envVar} está configurada.`);
        }
    });

    console.log("\n---------------------------------------------------");
    if (missing > 0) {
        console.error(`\n críticos: Se encontraron ${missing} variables faltantes.`);
        console.error("⚠️  EL DESPLIEGUE FALLARÁ O SERÁ INESTABLE SIN ESTAS VARIABLES.");
        process.exit(1);
    } else {
        console.log("\n🎉 ¡Auditoría exitosa! Todas las variables críticas están presentes.");
        process.exit(0);
    }
}

verify();
