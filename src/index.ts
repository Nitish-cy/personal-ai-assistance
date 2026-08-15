import 'dotenv/config';
import readline from 'node:readline/promises';
import { agentApp, buildSystemMessage } from './modules/agent/agent';

async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let config = { configurable: { thread_id: '1' } };

    while (true) {
        const userInput = await rl.question('You: ');
        if (userInput === '/bye') {
            break;
        }

        const result = await agentApp.invoke(
            {
                messages: [
                    buildSystemMessage(),
                    {
                        role: 'user',
                        content: userInput,
                    },
                ],
            },
            config
        );

        console.log('AI: ', result.messages[result.messages.length - 1]?.content);
    }

    rl.close();
}

main();
