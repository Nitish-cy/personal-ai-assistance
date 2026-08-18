import pinoHttp from 'pino-http';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { httpRequestDurationSeconds, httpRequestsTotal } from '../config/metrics';

export const requestLogger = pinoHttp({ logger });

function routeLabel(req: Request): string {
    const routePath = req.route?.path;
    return typeof routePath === 'string' ? `${req.baseUrl}${routePath}` || '/' : req.path;
}

export function httpMetrics(req: Request, res: Response, next: NextFunction) {
    const stopTimer = httpRequestDurationSeconds.startTimer();

    res.on('finish', () => {
        const labels = { method: req.method, route: routeLabel(req), status: String(res.statusCode) };
        httpRequestsTotal.inc(labels);
        stopTimer(labels);
    });

    next();
}
