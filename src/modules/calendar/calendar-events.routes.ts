import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/auth';
import { CalendarNotConnectedError, createEvent, deleteEvent, listEvents, updateEvent } from './calendar-service';

export const calendarEventsRouter = Router();

// Google's Schema$Event types don't allow `| undefined` on optional properties
// (incompatible with exactOptionalPropertyTypes), so zod's `.optional()` output -
// which types absent fields as `undefined` rather than omitting the key - needs
// those keys stripped before being handed to the googleapis client.
function omitUndefined<T extends object>(obj: T): { [K in keyof T]: Exclude<T[K], undefined> } {
    return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as {
        [K in keyof T]: Exclude<T[K], undefined>;
    };
}

calendarEventsRouter.get('/events', requireAuth, async (req, res) => {
    const timeMin = req.query.timeMin as string | undefined;
    const timeMax = req.query.timeMax as string | undefined;

    if (!timeMin || !timeMax) {
        res.status(400).json({ error: 'timeMin and timeMax are required' });
        return;
    }

    try {
        const events = await listEvents(req.user!.id, timeMin, timeMax);
        res.json({ events });
    } catch (err) {
        if (err instanceof CalendarNotConnectedError) {
            res.status(409).json({ error: err.message });
            return;
        }

        console.error('Failed to list events', err);
        res.status(500).json({ error: 'Failed to load calendar events.' });
    }
});

const eventSchema = z.object({
    summary: z.string().min(1),
    description: z.string().optional(),
    start: z.object({ dateTime: z.string(), timeZone: z.string() }),
    end: z.object({ dateTime: z.string(), timeZone: z.string() }),
    attendees: z
        .array(
            z
                .object({ email: z.email(), displayName: z.string().optional() })
                .transform((attendee) => ({ email: attendee.email, displayName: attendee.displayName ?? null }))
        )
        .optional(),
    recurrence: z.array(z.string()).optional(),
    colorId: z.string().optional(),
});

calendarEventsRouter.post('/events', requireAuth, async (req, res) => {
    const parsed = eventSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid event data' });
        return;
    }

    try {
        const event = await createEvent(req.user!.id, omitUndefined(parsed.data));
        res.status(201).json(event);
    } catch (err) {
        if (err instanceof CalendarNotConnectedError) {
            res.status(409).json({ error: err.message });
            return;
        }

        console.error('Failed to create event', err);
        res.status(500).json({ error: 'Failed to create event.' });
    }
});

const eventUpdateSchema = eventSchema.partial();

calendarEventsRouter.patch('/events/:id', requireAuth, async (req, res) => {
    const parsed = eventUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid event data' });
        return;
    }

    const eventId = req.params.id;

    if (typeof eventId !== 'string') {
        res.status(400).json({ error: 'Invalid event id' });
        return;
    }

    try {
        const event = await updateEvent(req.user!.id, eventId, omitUndefined(parsed.data));
        res.json(event);
    } catch (err) {
        if (err instanceof CalendarNotConnectedError) {
            res.status(409).json({ error: err.message });
            return;
        }

        console.error('Failed to update event', err);
        res.status(500).json({ error: 'Failed to update event.' });
    }
});

calendarEventsRouter.delete('/events/:id', requireAuth, async (req, res) => {
    const eventId = req.params.id;

    if (typeof eventId !== 'string') {
        res.status(400).json({ error: 'Invalid event id' });
        return;
    }

    try {
        await deleteEvent(req.user!.id, eventId);
        res.status(204).send();
    } catch (err) {
        if (err instanceof CalendarNotConnectedError) {
            res.status(409).json({ error: err.message });
            return;
        }

        console.error('Failed to delete event', err);
        res.status(500).json({ error: 'Failed to delete event.' });
    }
});
