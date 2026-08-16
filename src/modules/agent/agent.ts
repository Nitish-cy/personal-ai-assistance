import { ChatGroq } from '@langchain/groq';
import { createEventTool, deleteEventTool, findFreeSlotsTool, getEventsTool, updateEventTool } from '../calendar/tools';
import { createReminderTool } from '../reminders/reminders.tool';
import { END, MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { shouldContinue } from './routing';
import { checkpointer } from '../../config/checkpointer';

const tools = [createEventTool, getEventsTool, updateEventTool, deleteEventTool, findFreeSlotsTool, createReminderTool];

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

export const agentApp = graph.compile({ checkpointer });

export function buildSystemMessage() {
    const currentDateTime = new Date().toLocaleString('sv-SE').replace(' ', 'T');
    const timeZoneString = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
        role: 'system' as const,
        content: `You are a smart personal assistant that manages the user's Google Calendar.
                        Current datetime: ${currentDateTime}
                        Current timezone string: ${timeZoneString}

                        Rules for deleting or modifying events:
                        1. Never call delete-event or update-event straight away. First call get-events to find the specific event the user means.
                        2. Describe the exact event you found (title, date, time) and explicitly ask the user to confirm before doing anything.
                        3. Only call delete-event or update-event after the user clearly confirms in their next message (e.g. "yes", "confirm", "do it").
                        4. If more than one event could match, list them and ask the user to clarify which one first.
                        5. Never tell the user an action succeeded unless the tool result confirms it did.

                        Rules for scheduling:
                        6. create-event checks for conflicts automatically. If it reports a conflict, do not retry blindly - tell the user about the conflict, call find-free-slots to suggest alternatives, and only retry with ignoreConflicts=true if the user explicitly confirms they want that time anyway.
                        7. When asked to find a free slot or the best time for something, use find-free-slots rather than guessing from get-events results yourself.

                        Rules for reminders:
                        8. When asked to be reminded about something, first call get-events to find the exact event (its id and start time), then call create-reminder with that event's id, summary, start time, and how many minutes before to notify. Reminders are shown in-app only, not by email or push - say so if asked.`,
    };
}
