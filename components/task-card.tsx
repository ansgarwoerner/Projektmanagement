"use client";

import { useDraggable } from "@dnd-kit/core";
import { STATUS_LABEL, STATUSES, type Status } from "@/lib/constants";
import type { TaskView } from "@/lib/types";
import type { WeekWindow } from "@/lib/weeks";

export type MoveInput = {
  id: string;
  weekStart: string | null;
  status: string;
  beforeId?: string | null;
};

export function TaskCard({
  task,
  weeks,
  currentUserId,
  onMove,
  onDelete,
}: {
  task: TaskView;
  weeks: WeekWindow[];
  currentUserId: string;
  onMove: (input: MoveInput) => void;
  onDelete: (id: string) => void;
}) {
  const dragId = `task:${task.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId });

  return (
    <article
      ref={setNodeRef}
      data-task-title={task.title}
      className={`rounded-xl border border-line bg-white p-3 ${isDragging ? "opacity-40" : ""}`}
    >
      <div
        className="cursor-grab touch-none select-none rounded-lg active:cursor-grabbing"
        aria-label={`${task.title} ziehen`}
        {...listeners}
        {...attributes}
      >
        <h3 className="break-words text-sm font-semibold leading-5">{task.title}</h3>
          {task.notes ? <p className="mt-1 line-clamp-3 text-sm text-muted">{task.notes}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1">
            {task.kind === "personal" ? <span className="badge bg-[#efe7d2] text-[#6a5420]">Persönlich</span> : null}
            {task.audienceSlug ? (
              <span
                className={`badge text-white ${task.audienceSlug === "kmu" ? "bg-kmu" : "bg-startup"}`}
              >
                {task.audienceName}
              </span>
            ) : null}
            {task.phaseName ? <span className="badge bg-teal/10 text-teal">{task.phaseName}</span> : null}
          </div>
          {task.kind === "marketing" ? (
            <p className="mt-2 text-xs text-muted">{task.ownerId === currentUserId ? "Du" : task.ownerName}</p>
          ) : null}
        </div>
      <div
        className="mt-3 grid gap-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {task.weekStart ? (
          <label className="field">
            Status
            <select
              className="compact-select"
              value={task.status}
              aria-label={`Status von ${task.title}`}
              onChange={(event) =>
                onMove({ id: task.id, weekStart: task.weekStart, status: event.target.value })
              }
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <button
            type="button"
            className="btn btn-ghost"
            aria-pressed={task.status === "done"}
            onClick={() =>
              onMove({
                id: task.id,
                weekStart: null,
                status: task.status === "done" ? "todo" : "done",
              })
            }
          >
            {task.status === "done" ? "Wieder öffnen" : "Erledigt"}
          </button>
        )}
        <label className="field">
          Woche
          <select
            className="compact-select"
            value={task.weekStart ?? ""}
            aria-label={`Woche von ${task.title}`}
            onChange={(event) => changeWeek(task, event.target.value, onMove)}
          >
            {task.kind === "personal" ? <option value="">Meine Liste</option> : null}
            {weeks.map((week) => (
              <option key={week.start} value={week.start}>
                {week.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-2 flex justify-end" onPointerDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="btn-danger"
          onClick={() => {
            if (window.confirm(`„${task.title}“ löschen?`)) onDelete(task.id);
          }}
        >
          Löschen
        </button>
      </div>
    </article>
  );
}

function changeWeek(task: TaskView, value: string, onMove: (input: MoveInput) => void) {
  if (!value) {
    onMove({ id: task.id, weekStart: null, status: "todo" });
    return;
  }
  const status: Status = task.weekStart ? task.status : "todo";
  onMove({ id: task.id, weekStart: value, status });
}
