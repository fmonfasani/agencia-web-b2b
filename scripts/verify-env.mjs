// Environment audit script

const REQUIRED_ENV_VARS = [
    // Database & Auth
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",

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

    // Internal Security
    "INTERNAL_API_SECRET",
];

function verify() {
    console.log("🚀 Iniciando auditoría de variables de entorno para Producción...\n");

    let missing = 0;

    REQUIRED_ENV_VARS.forEach((envVar) => {
        if (!process.env[envVar]) {
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
