import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BACKEND_URL } from "@/lib/backend";
import { AssistantChat } from "./assistant-chat";

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

export default async function AssistantPage() {
  const cookieStore = await cookies();
  const user = await getMe(cookieStore.toString());

  if (!user) {
    redirect("/login");
  }

  return <AssistantChat userName={user.name} />;
}
