import 'dotenv/config';
import readline from 'node:readline/promises';
import { ChatGroq } from '@langchain/groq';
import { createEventTool, getEventsTool } from './tools';
import { END, MemorySaver, MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { AIMessage } from '@langchain/core/messages';

const tools = [createEventTool, getEventsTool];

const model = new ChatGroq({
    model: 'openai/gpt-oss-120b',
    temperature: 0,
}).bindTools(tools);

/**
 * Assistant node
 */
async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
}

/**
 * Tool node
 */
const toolNode = new ToolNode(tools);

/**
 * Conditional Edge
 */
function shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    // console.log('Last message', lastMessage);

    if (lastMessage.tool_calls?.length) {
        return 'tools';
    }

    return '__end__';
}

/**
 * Build the graph
 */
const graph = new StateGraph(MessagesAnnotation)
    .addNode('assistant', callModel)
    .addNode('tools', toolNode)
    .addEdge('__start__', 'assistant')
    .addEdge('tools', 'assistant')
    .addConditionalEdges('assistant', shouldContinue, {
        __end__: END,
        tools: 'tools',
    });

const checkpointer = new MemorySaver();

const app = graph.compile({ checkpointer });

async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let config = { configurable: { thread_id: '1' } };

    while (true) {
        const userInput = await rl.question('You: ');
        if (userInput === '/bye') {
            break;
        }

        const currentDateTime = new Date().toLocaleString('sv-SE').replace(' ', 'T');
        const timeZoneString = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const result = await app.invoke(
            {
                messages: [
                    {
                        role: 'system',
                        content: `You are a smart personal assistant.
                        Current datetime: ${currentDateTime}
                        Current timezone string: ${timeZoneString}`,
                    },
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