import pino from "pino"
import { LOG_LEVEL } from "@/config/logger.config"

const isDev = process.env.NODE_ENV === "development"

const logger = pino({
  level: LOG_LEVEL,
  base: { service: "pos-system" },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : {}),
})

export const log = {
  debug: (context: string, msg: string, data?: object) =>
    logger.debug({ context, ...data }, msg),

  info: (context: string, msg: string, data?: object) =>
    logger.info({ context, ...data }, msg),

  warn: (context: string, msg: string, data?: object) =>
    logger.warn({ context, ...data }, msg),

  error: (context: string, msg: string, error?: unknown, data?: object) =>
    logger.error({ context, error, ...data }, msg),
}
