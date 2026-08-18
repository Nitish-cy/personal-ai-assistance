export type TimeRange = { start: Date; end: Date };

export function hasConflict(busy: TimeRange[], candidate: TimeRange): boolean {
    return busy.some((slot) => candidate.start < slot.end && candidate.end > slot.start);
}

const DEFAULT_WORKING_HOURS = { startHour: 9, endHour: 18 };

export function findFreeSlots(
    busy: TimeRange[],
    rangeStart: Date,
    rangeEnd: Date,
    durationMinutes: number,
    workingHours: { startHour: number; endHour: number } = DEFAULT_WORKING_HOURS
): TimeRange[] {
    const durationMs = durationMinutes * 60 * 1000;
    const sortedBusy = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());
    const slots: TimeRange[] = [];

    let cursor = new Date(rangeStart);

    while (cursor < rangeEnd) {
        const dayStart = new Date(cursor);
        dayStart.setHours(workingHours.startHour, 0, 0, 0);
        const dayEnd = new Date(cursor);
        dayEnd.setHours(workingHours.endHour, 0, 0, 0);

        const windowStart = cursor > dayStart ? cursor : dayStart;
        const windowEnd = dayEnd < rangeEnd ? dayEnd : rangeEnd;

        if (windowStart < windowEnd) {
            const dayBusy = sortedBusy.filter((slot) => slot.end > windowStart && slot.start < windowEnd);
            let free = windowStart;

            for (const busySlot of dayBusy) {
                if (busySlot.start.getTime() - free.getTime() >= durationMs) {
                    slots.push({ start: new Date(free), end: new Date(busySlot.start) });
                }
                if (busySlot.end > free) {
                    free = busySlot.end;
                }
            }

            if (windowEnd.getTime() - free.getTime() >= durationMs) {
                slots.push({ start: new Date(free), end: new Date(windowEnd) });
            }
        }

        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
    }

    return slots;
}
