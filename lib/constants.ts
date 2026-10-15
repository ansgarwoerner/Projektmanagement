export const STATUSES = ["todo", "doing", "review", "done"] as const;

export type Status = (typeof STATUSES)[number];

export type TaskKind = "marketing" | "personal";

export type AudienceSlug = "kmu" | "startup";

export const STATUS_LABEL: Record<Status, string> = {
  todo: "Offen",
  doing: "In Arbeit",
  review: "Review",
  done: "Fertig",
};

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}
