import { tool } from '@langchain/core/tools';
import { google } from 'googleapis';
import z from 'zod';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
);

oauth2Client.setCredentials({
    access_token: process.env.GOOGLE_ACCESS_TOKEN ?? null,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? null,
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

type Params = {
    q: string;
    timeMin: string;
    timeMax: string;
};
export const getEventsTool = tool(
    async (params) => {
        /**
         * timeMin
         * timeMax
         * q
         */
        const { q, timeMin, timeMax } = params as Params;

        try {
            const response = await calendar.events.list({
                calendarId: 'primary',
                q: q,
                timeMin,
                timeMax,
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
        description: 'Call to get the calendar events.',
        schema: z.object({
            q: z
                .string()
                .describe(
                    "The query to be used to get events from google calendar. It can be one of these values: summary, description, location, attendees display name, attendees email, organiser's name, organiser's email"
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
    async (eventData) => {
        const { summary, start, end, attendees } = eventData as EventData;

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