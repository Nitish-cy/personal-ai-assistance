import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import cookieParser from 'cookie-parser';
import { dataSource } from './config/data-source';
import { authRouter } from './modules/auth/auth.routes';
import { calendarRouter } from './modules/calendar/calendar.routes';
import { agentRouter } from './modules/agent/agent.routes';

const app = express();
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));

app.use(calendarRouter);
app.use('/api', authRouter);
app.use('/api/agent', agentRouter);

async function start() {
    await dataSource.initialize();

    // Schema migrations are a deploy-time step (see `npm run migration:run`), not
    // something every application instance should race to do on boot - especially
    // once this runs as multiple replicas. Auto-run stays on for local convenience only.
    if (process.env.NODE_ENV !== 'production') {
        await dataSource.runMigrations();
    }

    app.listen(3600, () => console.log(`Server is running on port 3600`));
}

start().catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
});
