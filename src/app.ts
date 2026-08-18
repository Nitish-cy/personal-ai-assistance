import 'reflect-metadata';
import express from 'express';
import cookieParser from 'cookie-parser';
import { authRouter } from './modules/auth/auth.routes';
import { calendarRouter } from './modules/calendar/calendar.routes';
import { calendarEventsRouter } from './modules/calendar/calendar-events.routes';
import { agentRouter } from './modules/agent/agent.routes';
import { remindersRouter } from './modules/reminders/reminders.routes';
import { httpMetrics, requestLogger } from './middleware/observability';
import { metricsRegistry } from './config/metrics';

export const app = express();
app.use(requestLogger);
app.use(httpMetrics);
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));

app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
});

app.use(calendarRouter);
app.use('/api', authRouter);
app.use('/api/agent', agentRouter);
app.use('/api/calendar', calendarEventsRouter);
app.use('/api', remindersRouter);
