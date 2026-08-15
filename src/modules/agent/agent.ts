import { ChatGroq } from '@langchain/groq';
import { createEventTool, getEventsTool } from '../calendar/tools';
import { END, MemorySaver, MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { shouldContinue } from './routing';

const tools = [createEventTool, getEventsTool];

const model = new ChatGroq({
    model: 'openai/gpt-oss-120b',
    temperature: 0,
}).bindTools(tools);

async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
}

const toolNode = new ToolNode(tools);

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

export const agentApp = graph.compile({ checkpointer });

export function buildSystemMessage() {
    const currentDateTime = new Date().toLocaleString('sv-SE').replace(' ', 'T');
    const timeZoneString = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
        role: 'system' as const,
        content: `You are a smart personal assistant.
                        Current datetime: ${currentDateTime}
                        Current timezone string: ${timeZoneString}`,
    };
}
