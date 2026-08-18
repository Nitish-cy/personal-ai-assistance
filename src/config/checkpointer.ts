import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
}

// Manages its own tables/pool via node-postgres, independent of the TypeORM
// data source. setup() is idempotent - safe to call from every entry point
// that uses the agent (server + CLI) rather than assuming one has already run it.
export const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);
