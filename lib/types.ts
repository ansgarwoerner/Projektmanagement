import type { AudienceSlug, Status, TaskKind } from "@/lib/constants";

export type AudienceView = {
  id: string;
  slug: AudienceSlug;
  name: string;
  description: string;
};

export type PhaseView = {
  id: string;
  audienceId: string;
  sortOrder: number;
  name: string;
  goal: string;
  channels: string;
  message: string;
};

export type MemberView = {
  id: string;
  name: string;
};

export type TaskView = {
  id: string;
  title: string;
  notes: string;
  kind: TaskKind;
  ownerId: string;
  ownerName: string;
  audienceId: string | null;
  audienceSlug: AudienceSlug | null;
  audienceName: string | null;
  phaseId: string | null;
  phaseName: string | null;
  phaseOrder: number | null;
  weekStart: string | null;
  status: Status;
  sortOrder: number;
};
