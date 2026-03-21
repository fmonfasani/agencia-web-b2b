import winston from 'winston';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, '../../logs');

/**
 * Structured logger for the stripe-connector MCP server.
 * Writes to console (colorized) and rotating file.
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'stripe-connector' },
  transports: [
    // Console transport for development / debug
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, tool, ...meta }) => {
          const toolTag = tool ? ` [${tool}]` : '';
          const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}${toolTag} ${message}${metaStr}`;
        })
      ),
      // Only log to console if not in stdio mode (to avoid polluting MCP transport)
      silent: process.env.MCP_STDIO_MODE === 'true',
    }),
    // File transport
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'stripe-connector.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
    // Error-only file
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'stripe-connector-errors.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
});

/**
 * Create a child logger scoped to a specific tool name.
 */
export function toolLogger(toolName: string) {
  return logger.child({ tool: toolName });
}
