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
                patch: jest.fn().mockResolvedValue({ data: {} }),
                delete: jest.fn().mockResolvedValue({}),
            },
            freebusy: {
                query: jest.fn().mockResolvedValue({ data: { calendars: { primary: { busy: [] } } } }),
            },
        }),
    },
}));

import { createEventTool, deleteEventTool, findFreeSlotsTool, getEventsTool, updateEventTool } from './tools';

const calendarClient = (google.calendar as jest.Mock)();
const insertMock = calendarClient.events.insert as jest.Mock;
const listMock = calendarClient.events.list as jest.Mock;
const patchMock = calendarClient.events.patch as jest.Mock;
const deleteMock = calendarClient.events.delete as jest.Mock;
const freebusyQueryMock = calendarClient.freebusy.query as jest.Mock;

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

    it('refuses to create and reports a conflict instead of double-booking', async () => {
        freebusyQueryMock.mockResolvedValueOnce({
            data: {
                calendars: {
                    primary: { busy: [{ start: '2026-08-15T10:00:00Z', end: '2026-08-15T11:00:00Z' }] },
                },
            },
        });
        insertMock.mockClear();

        const result = await createEventTool.invoke({
            summary: 'Sync',
            start: { dateTime: '2026-08-15T10:00:00', timeZone: 'Asia/Calcutta' },
            end: { dateTime: '2026-08-15T11:00:00', timeZone: 'Asia/Calcutta' },
            attendees: [],
        });

        expect(insertMock).not.toHaveBeenCalled();
        expect(result).toMatch(/conflict/i);
    });

    it('creates the event anyway when ignoreConflicts is set, without checking freebusy', async () => {
        freebusyQueryMock.mockClear();
        insertMock.mockClear();

        await createEventTool.invoke({
            summary: 'Sync',
            start: { dateTime: '2026-08-15T10:00:00', timeZone: 'Asia/Calcutta' },
            end: { dateTime: '2026-08-15T11:00:00', timeZone: 'Asia/Calcutta' },
            attendees: [],
            ignoreConflicts: true,
        });

        expect(freebusyQueryMock).not.toHaveBeenCalled();
        expect(insertMock).toHaveBeenCalled();
    });
});

describe('findFreeSlotsTool', () => {
    it('queries freebusy for the primary calendar and returns computed slots', async () => {
        freebusyQueryMock.mockResolvedValueOnce({ data: { calendars: { primary: { busy: [] } } } });

        const result = await findFreeSlotsTool.invoke({
            timeMin: '2026-08-20T00:00:00',
            timeMax: '2026-08-21T00:00:00',
            durationMinutes: 60,
        });

        expect(freebusyQueryMock).toHaveBeenCalledWith(
            expect.objectContaining({
                requestBody: expect.objectContaining({ items: [{ id: 'primary' }] }),
            })
        );

        const slots = JSON.parse(result);
        expect(slots).toHaveLength(1);
    });
});

describe('getEventsTool', () => {
    it('queries events on the primary calendar', async () => {
        await getEventsTool.invoke({
            q: 'Sync',
            timeMin: '2026-08-15T00:00:00',
            timeMax: '2026-08-16T00:00:00',
        });

        expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ calendarId: 'primary', q: 'Sync' }));
    });

    it('omits q entirely (does not send an empty filter) when not given a search term', async () => {
        listMock.mockClear();

        await getEventsTool.invoke({
            timeMin: '2026-08-16T00:00:00',
            timeMax: '2026-08-17T00:00:00',
        });

        const callArgs = listMock.mock.calls[0]?.[0];
        expect(callArgs).not.toHaveProperty('q');
    });
});

describe('updateEventTool', () => {
    it('patches the event by id on the primary calendar', async () => {
        await updateEventTool.invoke({
            eventId: 'event-123',
            summary: 'Rescheduled sync',
        });

        expect(patchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                calendarId: 'primary',
                eventId: 'event-123',
                requestBody: expect.objectContaining({ summary: 'Rescheduled sync' }),
            })
        );
    });
});

describe('deleteEventTool', () => {
    it('deletes the event by id on the primary calendar', async () => {
        await deleteEventTool.invoke({ eventId: 'event-123' });

        expect(deleteMock).toHaveBeenCalledWith(
            expect.objectContaining({ calendarId: 'primary', eventId: 'event-123' })
        );
    });
});
