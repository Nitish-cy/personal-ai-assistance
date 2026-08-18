import { tool } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import z from 'zod';
import { createReminder } from './reminder.service';

const createReminderSchema = z.object({
    eventId: z.string().describe('The id of the event to remind about, obtained from a prior get-events call.'),
    eventSummary: z.string().describe('The title of the event, for display in the reminder.'),
    eventStart: z.string().describe("The event's start date time (ISO), obtained from get-events."),
    minutesBefore: z.number().describe('How many minutes before the event start to send the reminder.'),
});

export const createReminderTool = tool(
    async (params, config?: RunnableConfig) => {
        const { eventId, eventSummary, eventStart, minutesBefore } = params as z.infer<typeof createReminderSchema>;
        const userId = config?.configurable?.userId as string | undefined;

        if (!userId) {
            return 'Reminders are only available when signed in to the web app, not from the CLI.';
        }

        try {
            const remindAt = new Date(new Date(eventStart).getTime() - minutesBefore * 60 * 1000);
            await createReminder(userId, eventId, eventSummary, remindAt);

            return `Reminder set for ${minutesBefore} minutes before "${eventSummary}".`;
        } catch (err) {
            console.log('EERRRR', err);
            return 'Failed to set the reminder.';
        }
    },
    {
        name: 'create-reminder',
        description:
            "Sets an in-app reminder for an existing calendar event, notifying the user a number of minutes before it starts. The event must first be found via get-events so its exact id and start time are known.",
        schema: createReminderSchema,
    }
);
