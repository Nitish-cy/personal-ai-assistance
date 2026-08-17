export type GoogleEventDateTime = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

export type GoogleEventAttendee = {
  email: string;
  displayName?: string | null;
};

export type GoogleEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  attendees?: GoogleEventAttendee[];
  colorId?: string;
  recurrence?: string[];
  recurringEventId?: string;
};

export type EventFormValues = {
  summary: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeesText: string;
  colorId: string;
  recurrence: "none" | "daily" | "weekly" | "monthly";
};
