import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BACKEND_URL } from "@/lib/backend";
import { LogoutButton } from "./logout-button";
import { NotificationsBanner } from "./notifications-banner";

type Me = { id: string; name: string; email: string };

async function getMe(cookieHeader: string): Promise<Me | null> {
  const res = await fetch(`${BACKEND_URL}/api/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

async function getCalendarStatus(cookieHeader: string): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/api/calendar/status`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) {
    return false;
  }

  const data = (await res.json()) as { connected: boolean };
  return data.connected;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type DashboardPageProps = {
  searchParams: Promise<{ calendar?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const user = await getMe(cookieHeader);

  if (!user) {
    redirect("/login");
  }

  const connected = await getCalendarStatus(cookieHeader);
  const { calendar } = await searchParams;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex-1 bg-muted/40 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {calendar === "connected" && (
          <Badge className="bg-emerald-600 text-white">
            Google Calendar connected ✅
          </Badge>
        )}
        {calendar === "error" && (
          <Badge variant="destructive">
            Couldn&apos;t connect Google Calendar. Please try again.
          </Badge>
        )}

        <NotificationsBanner />

        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting()}, {user.name}
            </h1>
            <p className="text-muted-foreground">
              {today} &middot; {timeZone}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <LogoutButton />
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                {connected
                  ? "Your calendar is connected."
                  : "Connect your Google Calendar to let the assistant manage your schedule."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connected ? (
                <Link href="/calendar" className={buttonVariants()}>
                  Open Calendar
                </Link>
              ) : (
                <a href={`${BACKEND_URL}/auth`} className={buttonVariants()}>
                  Connect Google Calendar
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>Ask anything about your calendar.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/assistant" className={buttonVariants()}>
                Open Assistant
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
