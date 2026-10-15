import { and, asc, eq, gte, isNull, or } from "drizzle-orm";
import type { AudienceSlug, Status, TaskKind } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { audiences, funnelPhases, tasks, users } from "@/lib/db/schema";
import type { AudienceView, MemberView, PhaseView, TaskView } from "@/lib/types";
import { fourWeeks } from "@/lib/weeks";

export async function getFunnel() {
  const [audienceRows, phaseRows] = await Promise.all([
    getDb().select().from(audiences).orderBy(asc(audiences.slug)),
    getDb().select().from(funnelPhases).orderBy(asc(funnelPhases.sortOrder)),
  ]);

  return {
    audiences: audienceRows.map(toAudience),
    phases: phaseRows.map(toPhase),
  };
}

export async function getBoard(userId: string) {
  const windowStart = fourWeeks()[0]?.start ?? "1970-01-01";
  const database = getDb();
  const [audienceRows, phaseRows, memberRows, taskRows] = await Promise.all([
    database.select().from(audiences).orderBy(asc(audiences.slug)),
    database.select().from(funnelPhases).orderBy(asc(funnelPhases.sortOrder)),
    database.select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.name)),
    database
      .select({
        id: tasks.id,
        title: tasks.title,
        notes: tasks.notes,
        kind: tasks.kind,
        ownerId: tasks.ownerId,
        ownerName: users.name,
        audienceId: tasks.audienceId,
        phaseId: tasks.phaseId,
        weekStart: tasks.weekStart,
        status: tasks.status,
        sortOrder: tasks.sortOrder,
      })
      .from(tasks)
      .innerJoin(users, eq(users.id, tasks.ownerId))
      .where(
        or(
          and(eq(tasks.kind, "marketing"), gte(tasks.weekStart, windowStart)),
          and(
            eq(tasks.kind, "personal"),
            eq(tasks.ownerId, userId),
            or(isNull(tasks.weekStart), gte(tasks.weekStart, windowStart)),
          ),
        ),
      )
      .orderBy(asc(tasks.sortOrder), asc(tasks.title)),
  ]);

  const audienceById = new Map(audienceRows.map((row) => [row.id, row]));
  const phaseById = new Map(phaseRows.map((row) => [row.id, row]));

  const taskViews: TaskView[] = taskRows.map((row) => {
    const audience = row.audienceId ? audienceById.get(row.audienceId) : undefined;
    const phase = row.phaseId ? phaseById.get(row.phaseId) : undefined;
    return {
      id: row.id,
      title: row.title,
      notes: row.notes,
      kind: row.kind as TaskKind,
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      audienceId: row.audienceId,
      audienceSlug: (audience?.slug as AudienceSlug | undefined) ?? null,
      audienceName: audience?.name ?? null,
      phaseId: row.phaseId,
      phaseName: phase?.name ?? null,
      phaseOrder: phase?.sortOrder ?? null,
      weekStart: row.weekStart,
      status: row.status as Status,
      sortOrder: row.sortOrder,
    };
  });

  return {
    audiences: audienceRows.map(toAudience),
    phases: phaseRows.map(toPhase),
    members: memberRows satisfies MemberView[],
    tasks: taskViews,
  };
}

function toAudience(row: typeof audiences.$inferSelect): AudienceView {
  return {
    id: row.id,
    slug: row.slug as AudienceSlug,
    name: row.name,
    description: row.description,
  };
}

function toPhase(row: typeof funnelPhases.$inferSelect): PhaseView {
  return {
    id: row.id,
    audienceId: row.audienceId,
    sortOrder: row.sortOrder,
    name: row.name,
    goal: row.goal,
    channels: row.channels,
    message: row.message,
  };
}
