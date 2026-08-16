import 'dotenv/config';
import { app } from './app';
import { dataSource } from './config/data-source';
import { checkpointer } from './config/checkpointer';

async function start() {
    await dataSource.initialize();

    // Schema migrations are a deploy-time step (see `npm run migration:run`), not
    // something every application instance should race to do on boot - especially
    // once this runs as multiple replicas. Auto-run stays on for local convenience only.
    if (process.env.NODE_ENV !== 'production') {
        await dataSource.runMigrations();
    }

    // Idempotent by design (see config/checkpointer.ts) - safe to call on every boot.
    await checkpointer.setup();

    app.listen(3600, () => console.log(`Server is running on port 3600`));
}

start().catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
});
