import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

const COOKIE = "wochenplaner_session";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

async function requestIsHttps() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return forwarded === "https";
}

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET fehlt");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await requestIsHttps(),
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function readUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await readUserId();
  if (!userId) return null;
  const [user] = await getDb()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
