import { tool } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { google } from 'googleapis';
import z from 'zod';
import { getCalendarClientForUser } from './calendar-service';
import { findFreeSlots } from './scheduling';

function buildLegacyOAuthClient() {
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URL
    );

    client.setCredentials({
        access_token: process.env.GOOGLE_ACCESS_TOKEN ?? null,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? null,
    });

    return google.calendar({ version: 'v3', auth: client });
}

// Web/API requests carry a userId in config.configurable and use that user's
// connected Google account. The CLI (index.ts) has no user/session concept at
// all, so it falls back to the single account configured via .env.
async function getCalendarClientForConfig(config?: RunnableConfig) {
    const userId = config?.configurable?.userId as string | undefined;

    return userId ? getCalendarClientForUser(userId) : buildLegacyOAuthClient();
}

type Params = {
    q?: string;
    timeMin: string;
    timeMax: string;
};
export const getEventsTool = tool(
    async (params, config) => {
        const { q, timeMin, timeMax } = params as Params;

        try {
            const calendar = await getCalendarClientForConfig(config);
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
                ...(q ? { q } : {}),
            });

            const result = response.data.items?.map((event) => {
                return {
                    id: event.id,
                    summary: event.summary,
                    status: event.status,
                    organiser: event.organizer,
                    start: event.start,
                    end: event.end,
                    attendees: event.attendees,
                    meetingLink: event.hangoutLink,
                    eventType: event.eventType,
                };
            });

            return JSON.stringify(result);
        } catch (err) {
            console.log('EERRRR', err);
        }

        return 'Failed to connect to the calendar.';
    },
    {
        name: 'get-events',
        description:
            'Lists calendar events within a time range. Use this for any "what/when are my events" question, not just searches.',
        schema: z.object({
            q: z
                .string()
                .optional()
                .describe(
                    "Optional free-text filter matching summary, description, location, attendee, or organiser. Omit this entirely (do not pass an empty string) when the user just wants to see everything in the time range, e.g. \"do I have meetings today\" - only set it when they name something specific to search for, e.g. \"find my meeting with Raj\"."
                ),
            timeMin: z.string().describe('The from datetime to get events.'),
            timeMax: z.string().describe('The to datetime to get events.'),
        }),
    }
);

type attendee = {
    email: string;
    displayName: string;
};
const createEventSchema = z.object({
    summary: z.string().describe('The title of the event'),
    start: z.object({
        dateTime: z.string().describe('The date time of start of the event.'),
        timeZone: z.string().describe('Current IANA timezone string.'),
    }),
    end: z.object({
        dateTime: z.string().describe('The date time of end of the event.'),
        timeZone: z.string().describe('Current IANA timezone string.'),
    }),
    attendees: z.array(
        z.object({
            email: z.string().describe('The email of the attendee'),
            displayName: z.string().describe('Then name of the attendee.'),
        })
    ),
    ignoreConflicts: z
        .boolean()
        .optional()
        .describe(
            'Set true only if the user has explicitly confirmed they want to book this time despite a scheduling conflict you already warned them about.'
        ),
});

type EventData = z.infer<typeof createEventSchema>;
// type EventData = {
//     summary: string;
//     start: {
//         dateTime: string;
//         timeZone: string;
//     };
//     end: {
//         dateTime: string;
//         timeZone: string;
//     };
//     attendees: attendee[];
// };
export const createEventTool = tool(
    async (eventData, config) => {
        const { summary, start, end, attendees, ignoreConflicts } = eventData as EventData;

        const calendar = await getCalendarClientForConfig(config);

        if (!ignoreConflicts) {
            const freebusy = await calendar.freebusy.query({
                requestBody: { timeMin: start.dateTime, timeMax: end.dateTime, items: [{ id: 'primary' }] },
            });
            const busy = freebusy.data.calendars?.primary?.busy ?? [];

            if (busy.length > 0) {
                return `Scheduling conflict: the user already has ${busy.length} event(s) during that time (${JSON.stringify(
                    busy
                )}). Do not create the event. Tell the user about the conflict, call find-free-slots to suggest alternatives, and only call create-event again with ignoreConflicts=true if they explicitly confirm they want this time anyway.`;
            }
        }

        const response = await calendar.events.insert({
            calendarId: 'primary',
            sendUpdates: 'all',
            conferenceDataVersion: 1,
            requestBody: {
                summary,
                start,
                end,
                attendees,
                conferenceData: {
                    createRequest: {
                        requestId: crypto.randomUUID(),
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet',
                        },
                    },
                },
            },
        });

        if (response.statusText === 'OK') {
            return 'The meeting has been created.';
        }

        return "Couldn't create a meeting.";
    },
    {
        name: 'create-event',
        description: 'Call to create the calendar events.',
        schema: createEventSchema,
    }
);

const updateEventSchema = z.object({
    eventId: z.string().describe('The id of the event to update, obtained from a prior get-events call.'),
    summary: z.string().optional().describe('The new title of the event, if it is changing.'),
    start: z
        .object({
            dateTime: z.string().describe('The new start date time of the event.'),
            timeZone: z.string().describe('Current IANA timezone string.'),
        })
        .optional()
        .describe('The new start time, if rescheduling.'),
    end: z
        .object({
            dateTime: z.string().describe('The new end date time of the event.'),
            timeZone: z.string().describe('Current IANA timezone string.'),
        })
        .optional()
        .describe('The new end time, if rescheduling.'),
});

export const updateEventTool = tool(
    async (params, config) => {
        const { eventId, summary, start, end } = params as z.infer<typeof updateEventSchema>;

        try {
            const calendar = await getCalendarClientForConfig(config);

            const requestBody: Record<string, unknown> = {};
            if (summary) requestBody.summary = summary;
            if (start) requestBody.start = start;
            if (end) requestBody.end = end;

            await calendar.events.patch({ calendarId: 'primary', eventId, requestBody });

            return 'The event has been updated.';
        } catch (err) {
            console.log('EERRRR', err);
            return 'Failed to update the event.';
        }
    },
    {
        name: 'update-event',
        description:
            "Updates an existing calendar event, such as rescheduling it or renaming it. Requires the event's exact id, which must first be found via get-events. Only call this after the user has explicitly confirmed the specific event and the change being made - never call it from a vague or unconfirmed request.",
        schema: updateEventSchema,
    }
);

const deleteEventSchema = z.object({
    eventId: z.string().describe('The id of the event to delete, obtained from a prior get-events call.'),
});

const findFreeSlotsSchema = z.object({
    timeMin: z.string().describe('Start of the search range (ISO datetime).'),
    timeMax: z.string().describe('End of the search range (ISO datetime).'),
    durationMinutes: z.number().describe('Desired meeting duration in minutes.'),
});

export const findFreeSlotsTool = tool(
    async (params, config) => {
        const { timeMin, timeMax, durationMinutes } = params as z.infer<typeof findFreeSlotsSchema>;

        try {
            const calendar = await getCalendarClientForConfig(config);
            const freebusy = await calendar.freebusy.query({
                requestBody: { timeMin, timeMax, items: [{ id: 'primary' }] },
            });

            const busy = (freebusy.data.calendars?.primary?.busy ?? [])
                .filter((slot) => slot.start && slot.end)
                .map((slot) => ({ start: new Date(slot.start!), end: new Date(slot.end!) }));

            const slots = findFreeSlots(busy, new Date(timeMin), new Date(timeMax), durationMinutes);

            return JSON.stringify(
                slots.map((slot) => ({ start: slot.start.toISOString(), end: slot.end.toISOString() }))
            );
        } catch (err) {
            console.log('EERRRR', err);
            return 'Failed to check availability.';
        }
    },
    {
        name: 'find-free-slots',
        description:
            'Finds available time slots of the given duration within a date range, respecting working hours (9am-6pm local time) and the existing events on the calendar.',
        schema: findFreeSlotsSchema,
    }
);

export const deleteEventTool = tool(
    async (params, config) => {
        const { eventId } = params as z.infer<typeof deleteEventSchema>;

        try {
            const calendar = await getCalendarClientForConfig(config);
            await calendar.events.delete({ calendarId: 'primary', eventId });

            return 'The event has been deleted.';
        } catch (err) {
            console.log('EERRRR', err);
            return 'Failed to delete the event.';
        }
    },
    {
        name: 'delete-event',
        description:
            "Permanently deletes a calendar event. Requires the event's exact id, which must first be found via get-events. Only call this after the user has explicitly confirmed they want to delete this specific event - never delete without explicit confirmation.",
        schema: deleteEventSchema,
    }
);
