import 'dotenv/config';
import { dataSource } from './data-source';

const command = process.argv[2];

async function main() {
    await dataSource.initialize();

    if (command === 'revert') {
        await dataSource.undoLastMigration();
    } else {
        await dataSource.runMigrations();
    }

    await dataSource.destroy();
}

main().catch((err) => {
    console.error('Migration failed', err);
    process.exit(1);
});
