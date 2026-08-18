import { Router } from 'express';
import { requireAuth } from '../auth/auth';
import { listDueReminders, markReminderSeen } from './reminder.service';

export const remindersRouter = Router();

remindersRouter.get('/notifications', requireAuth, async (req, res) => {
    const reminders = await listDueReminders(req.user!.id);
    res.json({ notifications: reminders });
});

remindersRouter.post('/notifications/:id/seen', requireAuth, async (req, res) => {
    const reminderId = req.params.id;

    if (typeof reminderId !== 'string') {
        res.status(400).json({ error: 'Invalid reminder id' });
        return;
    }

    await markReminderSeen(req.user!.id, reminderId);
    res.status(204).send();
});
