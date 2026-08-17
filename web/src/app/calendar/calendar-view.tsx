"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import FullCalendar from "@fullcalendar/react";
import type {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput as FullCalendarEventInput,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Badge } from "@/components/ui/badge";
import { EventDialog } from "./event-dialog";
import { colorIdToHex } from "./colors";
import { recurrenceToRRule, formatDateInput, formatTimeInput } from "./recurrence";
import type { EventFormValues, GoogleEvent } from "./types";

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const EMPTY_FORM: EventFormValues = {
  summary: "",
  description: "",
  date: formatDateInput(new Date()),
  startTime: "09:00",
  endTime: "10:00",
  attendeesText: "",
  colorId: "",
  recurrence: "none",
};

function toFullCalendarEvent(event: GoogleEvent): FullCalendarEventInput {
  const allDay = !event.start?.dateTime;
  const hex = colorIdToHex(event.colorId);

  return {
    id: event.id,
    title: event.summary || "(No title)",
    start: event.start?.dateTime ?? event.start?.date,
    end: event.end?.dateTime ?? event.end?.date,
    allDay,
    backgroundColor: hex,
    borderColor: hex,
    extendedProps: {
      description: event.description ?? "",
      attendees: event.attendees ?? [],
      colorId: event.colorId ?? "",
    },
  };
}

export function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null);
  const [notConnected, setNotConnected] = useState(false);
  // Intl's resolved timeZone name can differ between server (Node/ICU) and
  // browser for the same real zone (e.g. "Asia/Calcutta" vs "Asia/Kolkata"),
  // which breaks hydration if rendered directly. Only ever compute it client-side.
  const [displayTimeZone, setDisplayTimeZone] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<EventFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    function detectTimeZone() {
      setDisplayTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }

    detectTimeZone();
  }, []);

  function refetch() {
    calendarRef.current?.getApi().refetchEvents();
  }

  async function fetchEvents(
    fetchInfo: { startStr: string; endStr: string },
    successCallback: (events: FullCalendarEventInput[]) => void,
    failureCallback: (error: Error) => void
  ) {
    try {
      const params = new URLSearchParams({ timeMin: fetchInfo.startStr, timeMax: fetchInfo.endStr });
      const res = await fetch(`/api/calendar/events?${params.toString()}`);

      if (res.status === 409) {
        setNotConnected(true);
        successCallback([]);
        return;
      }

      setNotConnected(false);

      if (!res.ok) {
        failureCallback(new Error("Failed to load events"));
        return;
      }

      const data = (await res.json()) as { events: GoogleEvent[] };
      successCallback(data.events.map(toFullCalendarEvent));
    } catch (err) {
      failureCallback(err instanceof Error ? err : new Error("Failed to load events"));
    }
  }

  function openCreateDialog(start: Date, end: Date, allDay: boolean) {
    setFormValues({
      ...EMPTY_FORM,
      date: formatDateInput(start),
      startTime: allDay ? "09:00" : formatTimeInput(start),
      endTime: allDay ? "10:00" : formatTimeInput(end),
    });
    setEditingEventId(null);
    setDialogMode("create");
    setFormError(null);
    setDialogOpen(true);
  }

  function handleSelect(selectInfo: DateSelectArg) {
    openCreateDialog(selectInfo.start, selectInfo.end, selectInfo.allDay);
    selectInfo.view.calendar.unselect();
  }

  function handleEventClick(clickInfo: EventClickArg) {
    const event = clickInfo.event;
    const start = event.start ?? new Date();
    const end = event.end ?? start;
    const attendees = (event.extendedProps.attendees ?? []) as { email: string }[];

    setFormValues({
      summary: event.title,
      description: (event.extendedProps.description as string) ?? "",
      date: formatDateInput(start),
      startTime: formatTimeInput(start),
      endTime: formatTimeInput(end),
      attendeesText: attendees.map((a) => a.email).join(", "),
      colorId: (event.extendedProps.colorId as string) ?? "",
      recurrence: "none",
    });
    setEditingEventId(event.id);
    setDialogMode("edit");
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleEventChange(changeInfo: EventDropArg | EventResizeDoneArg) {
    const event = changeInfo.event;

    if (!event.start) {
      changeInfo.revert();
      return;
    }

    try {
      const res = await fetch(`/api/calendar/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: { dateTime: event.start.toISOString(), timeZone: TIME_ZONE },
          end: { dateTime: (event.end ?? event.start).toISOString(), timeZone: TIME_ZONE },
        }),
      });

      if (!res.ok) {
        changeInfo.revert();
      }
    } catch {
      changeInfo.revert();
    }
  }

  function buildRequestBody(values: EventFormValues) {
    const body: Record<string, unknown> = {
      summary: values.summary,
      start: { dateTime: `${values.date}T${values.startTime}:00`, timeZone: TIME_ZONE },
      end: { dateTime: `${values.date}T${values.endTime}:00`, timeZone: TIME_ZONE },
    };

    if (values.description) {
      body.description = values.description;
    }

    if (values.colorId) {
      body.colorId = values.colorId;
    }

    const attendees = values.attendeesText
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean)
      .map((email) => ({ email }));

    if (attendees.length > 0) {
      body.attendees = attendees;
    }

    const rrule = recurrenceToRRule(values.recurrence);

    if (rrule) {
      body.recurrence = rrule;
    }

    return body;
  }

  async function handleFormSubmit() {
    setSubmitting(true);
    setFormError(null);

    try {
      const url = dialogMode === "edit" ? `/api/calendar/events/${editingEventId}` : "/api/calendar/events";
      const method = dialogMode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody(formValues)),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFormError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setDialogOpen(false);
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingEventId) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/calendar/events/${editingEventId}`, { method: "DELETE" });

      if (res.ok) {
        setDialogOpen(false);
        refetch();
      } else {
        const data = await res.json().catch(() => null);
        setFormError(data?.error ?? "Couldn't delete this event.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex-1 bg-muted/40 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
            <p className="text-sm text-muted-foreground">{displayTimeZone}</p>
          </div>
          <Link href="/dashboard" className="text-sm underline underline-offset-4">
            Back to dashboard
          </Link>
        </div>

        {notConnected && (
          <Badge variant="destructive">
            Google Calendar isn&apos;t connected yet - connect it from the dashboard to see and manage events.
          </Badge>
        )}

        <div className="rounded-xl bg-background p-4 shadow-sm">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            timeZone="local"
            selectable
            editable
            events={fetchEvents}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventChange}
            eventResize={handleEventChange}
          />
        </div>
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        values={formValues}
        onChange={setFormValues}
        onSubmit={handleFormSubmit}
        onDelete={dialogMode === "edit" ? handleDelete : undefined}
        submitting={submitting}
        error={formError}
      />
    </div>
  );
}
