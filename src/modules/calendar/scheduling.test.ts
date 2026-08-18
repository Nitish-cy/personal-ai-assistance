import { findFreeSlots, hasConflict } from './scheduling';

describe('hasConflict', () => {
    it('detects an overlapping range', () => {
        const busy = [{ start: new Date('2026-08-20T10:00:00'), end: new Date('2026-08-20T11:00:00') }];
        const candidate = { start: new Date('2026-08-20T10:30:00'), end: new Date('2026-08-20T11:30:00') };

        expect(hasConflict(busy, candidate)).toBe(true);
    });

    it('does not flag adjacent, non-overlapping ranges', () => {
        const busy = [{ start: new Date('2026-08-20T10:00:00'), end: new Date('2026-08-20T11:00:00') }];
        const candidate = { start: new Date('2026-08-20T11:00:00'), end: new Date('2026-08-20T12:00:00') };

        expect(hasConflict(busy, candidate)).toBe(false);
    });
});

describe('findFreeSlots', () => {
    it('returns the whole working-hours window when nothing is busy', () => {
        const slots = findFreeSlots(
            [],
            new Date('2026-08-20T00:00:00'),
            new Date('2026-08-21T00:00:00'),
            60
        );

        expect(slots).toHaveLength(1);
        expect(slots[0]!.start.getHours()).toBe(9);
        expect(slots[0]!.end.getHours()).toBe(18);
    });

    it('splits around a busy block in the middle of the day', () => {
        const busy = [{ start: new Date('2026-08-20T12:00:00'), end: new Date('2026-08-20T13:00:00') }];

        const slots = findFreeSlots(
            busy,
            new Date('2026-08-20T00:00:00'),
            new Date('2026-08-21T00:00:00'),
            60
        );

        expect(slots).toHaveLength(2);
        expect(slots[0]).toEqual({ start: new Date('2026-08-20T09:00:00'), end: new Date('2026-08-20T12:00:00') });
        expect(slots[1]).toEqual({ start: new Date('2026-08-20T13:00:00'), end: new Date('2026-08-20T18:00:00') });
    });

    it('returns no slots when the day is fully booked', () => {
        const busy = [{ start: new Date('2026-08-20T09:00:00'), end: new Date('2026-08-20T18:00:00') }];

        const slots = findFreeSlots(
            busy,
            new Date('2026-08-20T00:00:00'),
            new Date('2026-08-21T00:00:00'),
            30
        );

        expect(slots).toHaveLength(0);
    });

    it('excludes gaps shorter than the requested duration', () => {
        const busy = [
            { start: new Date('2026-08-20T10:00:00'), end: new Date('2026-08-20T11:00:00') },
            { start: new Date('2026-08-20T11:15:00'), end: new Date('2026-08-20T17:00:00') },
        ];

        const slots = findFreeSlots(
            busy,
            new Date('2026-08-20T00:00:00'),
            new Date('2026-08-21T00:00:00'),
            30
        );

        // the 11:00-11:15 gap (15 min) is too short for a 30-minute slot
        expect(slots.some((s) => s.start.getHours() === 11 && s.start.getMinutes() === 0)).toBe(false);
    });

    it('searches across multiple days', () => {
        const slots = findFreeSlots(
            [],
            new Date('2026-08-20T00:00:00'),
            new Date('2026-08-22T00:00:00'),
            60
        );

        expect(slots).toHaveLength(2);
    });
});
