import winston from "winston";

const { combine, timestamp, json, colorize, printf } = winston.format;

const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message} `;
    if (Object.keys(metadata).length > 0) {
        msg += JSON.stringify(metadata);
    }
    return msg;
});

// Logger estructurado para capturar eventos de negocio y errores
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        json()
    ),
    defaultMeta: { service: "agencia-web-b2b" },
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                customFormat
            ),
        }),
    ],
});

// Para logs críticos que queremos trackear en DB (opcional)
export const logError = (error: Error, context: any) => {
    logger.error(error.message, { ...context, stack: error.stack });
};
