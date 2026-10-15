"use server";

import { and, asc, eq, isNull, ne, or, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { isStatus, type Status } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { audiences, funnelPhases, tasks, users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";
import { isMonday } from "@/lib/weeks";

export type FormState = { error: string | null; saved?: boolean };

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email", 160).toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  await createSession(user.id);
  redirect("/plan");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function updatePhase(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const id = text(formData, "id", 80);
  const name = text(formData, "name", 80);
  const goal = text(formData, "goal", 500);
  const channels = text(formData, "channels", 240);
  const message = text(formData, "message", 500);
  if (!name) return { error: "Die Phase braucht einen Namen." };

  const [phase] = await getDb()
    .select({ id: funnelPhases.id })
    .from(funnelPhases)
    .where(eq(funnelPhases.id, id))
    .limit(1);
  if (!phase) return { error: "Phase nicht gefunden." };

  await getDb().update(funnelPhases).set({ name, goal, channels, message }).where(eq(funnelPhases.id, id));
  revalidatePath("/funnel");
  revalidatePath("/plan");
  return { error: null, saved: true };
}

export async function createMarketingTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const title = text(formData, "title", 160);
  const notes = text(formData, "notes", 2000);
  const audienceId = text(formData, "audienceId", 80);
  const phaseId = text(formData, "phaseId", 80);
  const assigneeId = text(formData, "assigneeId", 80) || user.id;
  const weekStart = text(formData, "weekStart", 10);

  if (!title) return { error: "Bitte einen Titel eingeben." };
  if (!isMonday(weekStart)) return { error: "Bitte eine gültige Woche wählen." };

  const [audience] = await getDb().select().from(audiences).where(eq(audiences.id, audienceId)).limit(1);
  const [phase] = await getDb().select().from(funnelPhases).where(eq(funnelPhases.id, phaseId)).limit(1);
  if (!audience || !phase || phase.audienceId !== audience.id) {
    return { error: "Phase und Zielgruppe passen nicht zusammen." };
  }

  const [assignee] = await getDb().select({ id: users.id }).from(users).where(eq(users.id, assigneeId)).limit(1);
  if (!assignee) return { error: "Diese Person gibt es nicht." };

  await getDb().insert(tasks).values({
    id: crypto.randomUUID(),
    title,
    notes,
    kind: "marketing",
    ownerId: assignee.id,
    audienceId: audience.id,
    phaseId: phase.id,
    weekStart,
    status: "todo",
    sortOrder: await nextSort(weekStart, "todo"),
  });
  revalidatePath("/plan");
  return { error: null, saved: true };
}

export async function createPersonalTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const title = text(formData, "title", 160);
  const notes = text(formData, "notes", 2000);
  if (!title) return { error: "Bitte einen Titel eingeben." };

  await getDb().insert(tasks).values({
    id: crypto.randomUUID(),
    title,
    notes,
    kind: "personal",
    ownerId: user.id,
    audienceId: null,
    phaseId: null,
    weekStart: null,
    status: "todo",
    sortOrder: await nextSort(null, "todo", user.id),
  });
  revalidatePath("/plan");
  return { error: null, saved: true };
}

export async function moveTask(input: {
  id: string;
  weekStart: string | null;
  status: string;
  beforeId?: string | null;
}): Promise<FormState> {
  const user = await requireUser();
  if (!isStatus(input.status)) return { error: "Unbekannter Status." };
  if (input.weekStart !== null && !isMonday(input.weekStart)) {
    return { error: "Ungültige Woche." };
  }

  const [task] = await getDb().select().from(tasks).where(eq(tasks.id, input.id)).limit(1);
  if (!task) return { error: "Aufgabe nicht gefunden." };
  if (task.kind === "personal" && task.ownerId !== user.id) {
    return { error: "Diese Aufgabe gehört jemand anderem." };
  }
  if (task.kind === "marketing" && input.weekStart === null) {
    return { error: "Marketingaufgaben bleiben in einer Woche." };
  }

  const status: Status = input.status;
  const weekStart = input.weekStart;
  const siblings = await getDb()
    .select({ id: tasks.id, sortOrder: tasks.sortOrder })
    .from(tasks)
    .where(and(ne(tasks.id, task.id), destinationFilter(weekStart, status, user.id)))
    .orderBy(asc(tasks.sortOrder));

  const ordered = [...siblings];
  const beforeIndex = input.beforeId ? ordered.findIndex((row) => row.id === input.beforeId) : -1;
  const moved = { id: task.id, sortOrder: 0 };
  if (beforeIndex >= 0) ordered.splice(beforeIndex, 0, moved);
  else ordered.push(moved);

  const now = new Date();
  await getDb().transaction(async (tx) => {
    for (const [index, row] of ordered.entries()) {
      if (row.id === task.id) {
        await tx.update(tasks).set({ sortOrder: index, weekStart, status, updatedAt: now }).where(eq(tasks.id, row.id));
      } else if (row.sortOrder !== index) {
        await tx.update(tasks).set({ sortOrder: index }).where(eq(tasks.id, row.id));
      }
    }
  });

  revalidatePath("/plan");
  return { error: null };
}

export async function deleteTask(id: string): Promise<FormState> {
  const user = await requireUser();
  const [task] = await getDb().select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) return { error: "Aufgabe nicht gefunden." };
  if (task.kind === "personal" && task.ownerId !== user.id) {
    return { error: "Diese Aufgabe gehört jemand anderem." };
  }
  await getDb().delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/plan");
  return { error: null };
}

function destinationFilter(weekStart: string | null, status: Status, userId: string): SQL {
  if (weekStart === null) {
    return and(
      eq(tasks.status, status),
      isNull(tasks.weekStart),
      eq(tasks.kind, "personal"),
      eq(tasks.ownerId, userId),
    ) as SQL;
  }
  return and(
    eq(tasks.status, status),
    eq(tasks.weekStart, weekStart),
    or(eq(tasks.kind, "marketing"), eq(tasks.ownerId, userId)),
  ) as SQL;
}

async function nextSort(weekStart: string | null, status: Status, ownerId?: string) {
  const filters = [
    eq(tasks.status, status),
    weekStart === null ? isNull(tasks.weekStart) : eq(tasks.weekStart, weekStart),
  ];
  if (ownerId) filters.push(eq(tasks.ownerId, ownerId));
  const rows = await getDb()
    .select({ sortOrder: tasks.sortOrder })
    .from(tasks)
    .where(and(...filters))
    .orderBy(asc(tasks.sortOrder));
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "")
    .trim()
    .slice(0, max);
}
