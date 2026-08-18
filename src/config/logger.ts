import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// Session cookies and auth headers must never land in logs, even structured ones.
const redact = {
    paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'res.headers["set-cookie"]',
        '*.password',
        '*.passwordHash',
    ],
    censor: '[redacted]',
};

export const logger = isProduction
    ? pino({ level: process.env.LOG_LEVEL ?? 'info', redact })
    : pino({
          level: process.env.LOG_LEVEL ?? 'info',
          redact,
          transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
      });
