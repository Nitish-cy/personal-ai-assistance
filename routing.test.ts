import { shouldContinue } from './routing';

describe('shouldContinue', () => {
    it('routes to tools when the last AI message has tool calls', () => {
        const state = {
            messages: [{ tool_calls: [{ name: 'get-events', args: {}, id: '1' }] }],
        } as any;

        expect(shouldContinue(state)).toBe('tools');
    });

    it('ends when the last AI message has no tool calls', () => {
        const state = { messages: [{ tool_calls: [] }] } as any;

        expect(shouldContinue(state)).toBe('__end__');
    });

    it('ends when the last AI message has no tool_calls field at all', () => {
        const state = { messages: [{ content: 'hello' }] } as any;

        expect(shouldContinue(state)).toBe('__end__');
    });
});
