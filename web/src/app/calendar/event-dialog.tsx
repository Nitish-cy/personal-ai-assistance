"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_COLORS } from "./colors";
import type { EventFormValues } from "./types";

type EventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  values: EventFormValues;
  onChange: (values: EventFormValues) => void;
  onSubmit: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  submitting: boolean;
  error: string | null;
};

export function EventDialog({
  open,
  onOpenChange,
  mode,
  values,
  onChange,
  onSubmit,
  onDelete,
  submitting,
  error,
}: EventDialogProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void onSubmit();
  }

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Create event" : "Edit event"}</DialogTitle>
            <DialogDescription>
              {mode === "create" ? "Add a new event to your calendar." : "Update or delete this event."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-summary">Title</Label>
              <Input
                id="event-summary"
                required
                value={values.summary}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("summary", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1 space-y-2">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  required
                  value={values.date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("date", e.target.value)}
                />
              </div>
              <div className="col-span-1 space-y-2">
                <Label htmlFor="event-start">Start</Label>
                <Input
                  id="event-start"
                  type="time"
                  required
                  value={values.startTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("startTime", e.target.value)}
                />
              </div>
              <div className="col-span-1 space-y-2">
                <Label htmlFor="event-end">End</Label>
                <Input
                  id="event-end"
                  type="time"
                  required
                  value={values.endTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("endTime", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                rows={2}
                value={values.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("description", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-attendees">Attendees (comma-separated emails)</Label>
              <Input
                id="event-attendees"
                value={values.attendeesText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("attendeesText", e.target.value)}
                placeholder="raj@example.com, sam@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Repeats</Label>
                <Select
                  value={values.recurrence}
                  onValueChange={(value) => set("recurrence", value as EventFormValues["recurrence"])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-1.5 pt-1">
                  {EVENT_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      title={color.label}
                      onClick={() => set("colorId", values.colorId === color.id ? "" : color.id)}
                      className="size-6 rounded-full ring-offset-2 transition-shadow"
                      style={{
                        backgroundColor: color.hex,
                        boxShadow: values.colorId === color.id ? `0 0 0 2px ${color.hex}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {mode === "edit" && onDelete ? (
              <Button type="button" variant="destructive" onClick={() => void onDelete()} disabled={submitting}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : mode === "create" ? "Create event" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
