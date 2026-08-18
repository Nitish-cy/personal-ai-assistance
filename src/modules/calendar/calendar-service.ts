import { google, type calendar_v3 } from 'googleapis';
import { getGoogleClientForUser } from './google-account';

export class CalendarNotConnectedError extends Error {
    constructor() {
        super('No connected Google Calendar account for this user.');
        this.name = 'CalendarNotConnectedError';
    }
}

export async function getCalendarClientForUser(userId: string) {
    const oauth2Client = await getGoogleClientForUser(userId);

    if (!oauth2Client) {
        throw new CalendarNotConnectedError();
    }

    return google.calendar({ version: 'v3', auth: oauth2Client });
}

export type EventInput = calendar_v3.Schema$Event;

export async function listEvents(userId: string, timeMin: string, timeMax: string) {
    const calendar = await getCalendarClientForUser(userId);

    const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
    });

    return response.data.items ?? [];
}

export async function createEvent(userId: string, input: EventInput) {
    const calendar = await getCalendarClientForUser(userId);

    const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: input,
    });

    return response.data;
}

export async function updateEvent(userId: string, eventId: string, input: EventInput) {
    const calendar = await getCalendarClientForUser(userId);

    const response = await calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: input,
    });

    return response.data;
}

export async function deleteEvent(userId: string, eventId: string) {
    const calendar = await getCalendarClientForUser(userId);
    await calendar.events.delete({ calendarId: 'primary', eventId });
}
