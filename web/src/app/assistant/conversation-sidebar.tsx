"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Conversation = { id: string; title: string; updatedAt: string };

type GroupLabel = "Today" | "Yesterday" | "Older";
const GROUP_ORDER: GroupLabel[] = ["Today", "Yesterday", "Older"];

function groupLabel(dateStr: string): GroupLabel {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  return "Older";
}

type ConversationSidebarProps = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
};

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: ConversationSidebarProps) {
  const groups: Record<GroupLabel, Conversation[]> = { Today: [], Yesterday: [], Older: [] };
  for (const conversation of conversations) {
    groups[groupLabel(conversation.updatedAt)].push(conversation);
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
        >
          <PlusIcon className="size-4" />
          New chat
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 && (
          <p className="px-2 pt-6 text-center text-sm text-zinc-500">No conversations yet</p>
        )}

        {GROUP_ORDER.map((label) =>
          groups[label].length > 0 ? (
            <div key={label}>
              <p className="px-2 pb-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
              <div className="space-y-0.5">
                {groups[label].map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => onSelect(conversation.id)}
                    className={cn(
                      "group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm text-zinc-300 hover:bg-zinc-800",
                      activeId === conversation.id && "bg-zinc-800 text-zinc-50"
                    )}
                  >
                    <span className="truncate">{conversation.title}</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(conversation.id);
                      }}
                      className="shrink-0 text-zinc-500 opacity-0 hover:text-red-400 group-hover:opacity-100"
                      aria-label="Delete conversation"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </aside>
  );
}
