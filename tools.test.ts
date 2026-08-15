import { google } from 'googleapis';

jest.mock('./google-account', () => ({
    getGoogleClientForUser: jest.fn(),
}));

jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                setCredentials: jest.fn(),
            })),
        },
        calendar: jest.fn().mockReturnValue({
            events: {
                insert: jest.fn().mockResolvedValue({ statusText: 'OK' }),
                list: jest.fn().mockResolvedValue({ data: { items: [] } }),
            },
        }),
    },
}));

import { createEventTool, getEventsTool } from './tools';

const calendarClient = (google.calendar as jest.Mock)();
const insertMock = calendarClient.events.insert as jest.Mock;
const listMock = calendarClient.events.list as jest.Mock;

describe('createEventTool', () => {
    it('creates events on the primary calendar, not a hardcoded account', async () => {
        await createEventTool.invoke({
            summary: 'Sync',
            start: { dateTime: '2026-08-15T10:00:00', timeZone: 'Asia/Calcutta' },
            end: { dateTime: '2026-08-15T11:00:00', timeZone: 'Asia/Calcutta' },
            attendees: [],
        });

        expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ calendarId: 'primary' }));
    });
});

describe('getEventsTool', () => {
    it('queries events on the primary calendar', async () => {
        await getEventsTool.invoke({
            q: 'Sync',
            timeMin: '2026-08-15T00:00:00',
            timeMax: '2026-08-16T00:00:00',
        });

        expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ calendarId: 'primary' }));
    });
});
