"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  eventSummary: string;
  remindAt: string;
};

const POLL_INTERVAL_MS = 30_000;

export function NotificationsBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { notifications: Notification[] };
        if (!cancelled) setNotifications(data.notifications);
      } catch {
        // Silently skip a failed poll - it'll retry on the next interval.
      }
    }

    void poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}/seen`, { method: "POST" });
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
        >
          <Badge>Reminder</Badge>
          <p className="flex-1 text-sm">{notification.eventSummary} is starting soon.</p>
          <Button variant="outline" size="sm" onClick={() => void dismiss(notification.id)}>
            Dismiss
          </Button>
        </div>
      ))}
    </div>
  );
}
