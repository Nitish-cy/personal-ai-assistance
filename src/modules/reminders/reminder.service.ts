import { dataSource } from '../../config/data-source';
import { Reminder } from '../../entities/Reminder';

export async function createReminder(userId: string, eventId: string, eventSummary: string, remindAt: Date) {
    const repo = dataSource.getRepository(Reminder);
    return repo.save(repo.create({ userId, eventId, eventSummary, remindAt }));
}

export async function listDueReminders(userId: string) {
    const repo = dataSource.getRepository(Reminder);

    return repo
        .createQueryBuilder('reminder')
        .where('reminder.userId = :userId', { userId })
        .andWhere('reminder.remindAt <= :now', { now: new Date() })
        .andWhere('reminder.seen = false')
        .orderBy('reminder.remindAt', 'ASC')
        .getMany();
}

export async function markReminderSeen(userId: string, reminderId: string) {
    await dataSource.getRepository(Reminder).update({ id: reminderId, userId }, { seen: true });
}
