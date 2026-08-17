import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { BACKEND_URL } from "@/lib/backend";

export default async function Home() {
  const cookieStore = await cookies();

  const res = await fetch(`${BACKEND_URL}/api/me`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  redirect(res.ok ? "/dashboard" : "/login");
}
