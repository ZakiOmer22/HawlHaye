import { cookies } from "next/headers";
import type { User } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data: User };
    return body.data ?? null;
  } catch {
    return null;
  }
}
