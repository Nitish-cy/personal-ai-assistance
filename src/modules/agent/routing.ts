import type { AIMessage } from '@langchain/core/messages';
import type { MessagesAnnotation } from '@langchain/langgraph';

export function shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

    if (lastMessage.tool_calls?.length) {
        return 'tools';
    }

    return '__end__';
}
