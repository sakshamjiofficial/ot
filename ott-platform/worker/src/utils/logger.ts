import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, jobId, stack, ...meta }) => {
  const jobTag = jobId ? ` [job:${jobId}]` : '';
  const metaStr = Object.keys(meta).length
    ? ' ' + JSON.stringify(meta)
    : '';
  return `${timestamp} ${level}${jobTag}: ${stack || message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat,
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        errors({ stack: true }),
        timestamp({ format: 'HH:mm:ss' }),
        logFormat,
      ),
    }),
    new winston.transports.File({
      filename: './logs/error.log',
      level:    'error',
      maxsize:  10 * 1024 * 1024,   // 10 MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: './logs/combined.log',
      maxsize:  50 * 1024 * 1024,   // 50 MB
      maxFiles: 3,
    }),
  ],
});

// Child logger with job context
export const jobLogger = (jobId: string) =>
  logger.child({ jobId });
