"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition, useActionState } from "react";
import { createMarketingTask, createPersonalTask, deleteTask, moveTask, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { TaskCard, type MoveInput } from "@/components/task-card";
import { isStatus, STATUS_LABEL, STATUSES, type Status } from "@/lib/constants";
import type { AudienceView, MemberView, PhaseView, TaskView } from "@/lib/types";
import type { WeekWindow } from "@/lib/weeks";
const INITIAL: FormState = { error: null };

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const collisions = hits.length > 0 ? hits : closestCorners(args);
  return [...collisions].sort((left, right) => specificity(String(right.id)) - specificity(String(left.id)));
};

export function PlanBoard({
  weeks,
  selectedWeek,
  audienceFilter,
  audiences,
  phases,
  members,
  tasks,
  currentUserId,
}: {
  weeks: WeekWindow[];
  selectedWeek: string;
  audienceFilter: "all" | "kmu" | "startup";
  audiences: AudienceView[];
  phases: PhaseView[];
  members: MemberView[];
  tasks: TaskView[];
  currentUserId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const overIdRef = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const activeTask = tasks.find((task) => `task:${task.id}` === activeId) ?? null;
  const weekSet = useMemo(() => new Set(weeks.map((week) => week.start)), [weeks]);

  const visibleTasks = tasks.filter((task) => {
    if (task.kind === "personal") return true;
    return audienceFilter === "all" || task.audienceSlug === audienceFilter;
  });
  const inboxOpen = visibleTasks.filter((task) => task.kind === "personal" && !task.weekStart && task.status !== "done");
  const inboxDone = visibleTasks.filter((task) => task.kind === "personal" && !task.weekStart && task.status === "done");
  const weekTasks = visibleTasks.filter((task) => task.weekStart === selectedWeek);
  const selected = weeks.find((week) => week.start === selectedWeek) ?? weeks[0];

  const missing = audiences.flatMap((audience) => {
    if (audienceFilter !== "all" && audience.slug !== audienceFilter) return [];
    return phases
      .filter((phase) => phase.audienceId === audience.id)
      .filter(
        (phase) =>
          !tasks.some(
            (task) =>
              task.kind === "marketing" &&
              task.phaseId === phase.id &&
              task.weekStart !== null &&
              weekSet.has(task.weekStart),
          ),
      )
      .map((phase) => `${audience.name} · ${phase.name}`);
  });

  function persist(input: MoveInput) {
    if (!isStatus(input.status)) {
      setError("Unbekannter Status.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await moveTask(input);
        setError(result.error);
      } catch {
        setError("Die Aufgabe konnte nicht verschoben werden.");
      }
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteTask(id);
      setError(result.error);
    });
  }

  function finishDrag(active: string, overId: string) {
    if (!overId || overId === active) return;
    const source = tasks.find((task) => `task:${task.id}` === active);
    if (!source) return;
    const destination = resolveDrop(overId, source, tasks, selectedWeek);
    if (!destination || "error" in destination) {
      if (destination && "error" in destination) setError(destination.error);
      return;
    }
    if (destination.weekStart === source.weekStart && destination.status === source.status && !destination.beforeId) {
      return;
    }
    persist(destination);
  }

  function onDragEnd(event: DragEndEvent) {
    const overId = event.over ? String(event.over.id) : (overIdRef.current ?? "");
    overIdRef.current = null;
    document.body.classList.remove("select-none");
    setActiveId(null);
    finishDrag(String(event.active.id), overId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={(event) => {
        overIdRef.current = null;
        document.body.classList.add("select-none");
        setActiveId(String(event.active.id));
      }}
      onDragOver={(event) => {
        if (event.over) overIdRef.current = String(event.over.id);
      }}
      onDragEnd={onDragEnd}
      onDragCancel={(event) => {
        const overId = overIdRef.current ?? "";
        overIdRef.current = null;
        document.body.classList.remove("select-none");
        setActiveId(null);
        finishDrag(String(event.active.id), overId);
      }}
    >
      <div
        className={`grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] ${pending ? "opacity-80" : ""}`}
        aria-busy={pending}
        onDragStartCapture={(event) => event.preventDefault()}
      >
        <section className="grid gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Zielgruppe filtern">
            <FilterLink current={audienceFilter} value="all" week={selectedWeek}>
              Alle
            </FilterLink>
            {audiences.map((audience) => (
              <FilterLink key={audience.id} current={audienceFilter} value={audience.slug} week={selectedWeek}>
                {audience.name}
              </FilterLink>
            ))}
          </div>
          <div className="grid grid-cols-2 items-start gap-2 xl:grid-cols-4">
            {weeks.map((week) => (
              <WeekChip
                key={week.start}
                week={week}
                selected={week.start === selectedWeek}
                count={visibleTasks.filter((task) => task.weekStart === week.start).length}
                href={planHref(week.start, audienceFilter)}
              />
            ))}
          </div>
          {missing.length > 0 ? (
            <p className="panel px-4 py-3 text-sm text-muted">
              In den nächsten vier Wochen ist noch keine Aufgabe geplant für: {missing.join(", ")}.
            </p>
          ) : (
            <p className="panel px-4 py-3 text-sm text-teal">Jede sichtbare Funnel-Phase hat in den vier Wochen mindestens eine Aufgabe.</p>
          )}
          {error ? (
            <p role="alert" className="text-sm font-medium text-[#8d3b24]">
              {error}
            </p>
          ) : null}
          <MarketingForm
            audiences={audiences}
            phases={phases}
            members={members}
            selectedWeek={selectedWeek}
            audienceFilter={audienceFilter}
            currentUserId={currentUserId}
          />
          <div>
            <h2 className="serif text-2xl">
              Kanban · {selected?.label} · {selected?.rangeLabel}
            </h2>
            <p className="mt-1 text-sm text-muted">Karten zwischen den Spalten oder nach oben in eine andere Woche ziehen.</p>
          </div>
          <div className="relative z-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={weekTasks.filter((task) => task.status === status)}
                weeks={weeks}
                currentUserId={currentUserId}
                onMove={persist}
                onDelete={remove}
              />
            ))}
          </div>
        </section>
        <PersonalInbox
          openTasks={inboxOpen}
          doneTasks={inboxDone}
          weeks={weeks}
          currentUserId={currentUserId}
          onMove={persist}
          onDelete={remove}
        />
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="panel max-w-xs px-3 py-2 text-sm font-semibold shadow-xl">{activeTask.title}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function FilterLink({
  current,
  value,
  week,
  children,
}: {
  current: string;
  value: "all" | "kmu" | "startup";
  week: string;
  children: string;
}) {
  const active = current === value;
  return (
    <Link
      href={planHref(week, value)}
      aria-current={active ? "true" : undefined}
      className={`btn ${active ? "btn-primary" : "btn-ghost"}`}
    >
      {children}
    </Link>
  );
}

function WeekChip({
  week,
  selected,
  count,
  href,
}: {
  week: WeekWindow;
  selected: boolean;
  count: number;
  href: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `week:${week.start}` });
  return (
    <div ref={setNodeRef} className={`drop-target relative z-0 ${isOver ? "is-over" : ""}`}>
      <Link
        href={href}
        draggable={false}
        aria-current={selected ? "true" : undefined}
        className={`panel block px-3 py-3 ${selected ? "border-teal" : ""}`}
      >
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{week.label}</span>
        <span className="serif mt-1 block text-lg leading-tight">{week.rangeLabel}</span>
        <span className="mt-2 block text-sm text-muted">
          {count} {count === 1 ? "Aufgabe" : "Aufgaben"}
        </span>
      </Link>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  weeks,
  currentUserId,
  onMove,
  onDelete,
}: {
  status: Status;
  tasks: TaskView[];
  weeks: WeekWindow[];
  currentUserId: string;
  onMove: (input: MoveInput) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `status:${status}` });
  return (
    <section ref={setNodeRef} className={`drop-target panel flex min-h-64 flex-col gap-3 p-3 ${isOver ? "is-over" : ""}`}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{STATUS_LABEL[status]}</h3>
        <span className="text-xs text-muted">{tasks.length}</span>
      </header>
      <div className="grid gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} weeks={weeks} currentUserId={currentUserId} onMove={onMove} onDelete={onDelete} />
        ))}
      </div>
      {tasks.length === 0 ? <p className="text-sm text-muted">Noch keine Aufgabe.</p> : null}
    </section>
  );
}

function PersonalInbox({
  openTasks,
  doneTasks,
  weeks,
  currentUserId,
  onMove,
  onDelete,
}: {
  openTasks: TaskView[];
  doneTasks: TaskView[];
  weeks: WeekWindow[];
  currentUserId: string;
  onMove: (input: MoveInput) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "inbox" });
  return (
    <aside ref={setNodeRef} className={`drop-target panel grid gap-4 p-4 lg:sticky lg:top-20 ${isOver ? "is-over" : ""}`}>
      <div>
        <h2 className="serif text-2xl">Meine Liste</h2>
        <p className="mt-1 text-sm text-muted">Nur für dich. In eine Woche ziehen oder hier abhaken.</p>
      </div>
      <PersonalForm />
      <div className="grid gap-2">
        {openTasks.map((task) => (
          <TaskCard key={task.id} task={task} weeks={weeks} currentUserId={currentUserId} onMove={onMove} onDelete={onDelete} />
        ))}
        {openTasks.length === 0 ? <p className="text-sm text-muted">Keine offenen privaten Aufgaben.</p> : null}
      </div>
      {doneTasks.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Erledigt ({doneTasks.length})</summary>
          <div className="mt-2 grid gap-2">
            {doneTasks.map((task) => (
              <TaskCard key={task.id} task={task} weeks={weeks} currentUserId={currentUserId} onMove={onMove} onDelete={onDelete} />
            ))}
          </div>
        </details>
      ) : null}
    </aside>
  );
}

function MarketingForm({
  audiences,
  phases,
  members,
  selectedWeek,
  audienceFilter,
  currentUserId,
}: {
  audiences: AudienceView[];
  phases: PhaseView[];
  members: MemberView[];
  selectedWeek: string;
  audienceFilter: "all" | "kmu" | "startup";
  currentUserId: string;
}) {
  const [state, action] = useActionState(createMarketingTask, INITIAL);
  const [version, setVersion] = useState(0);
  const [seenState, setSeenState] = useState(state);
  const [audienceId, setAudienceId] = useState(
    () => audiences.find((audience) => audience.slug === audienceFilter)?.id ?? audiences[0]?.id ?? "",
  );
  const [phaseId, setPhaseId] = useState(
    () => phases.find((phase) => phase.audienceId === audienceId)?.id ?? "",
  );
  const [seenFilter, setSeenFilter] = useState(audienceFilter);

  if (state !== seenState) {
    setSeenState(state);
    if (state.saved) setVersion((value) => value + 1);
  }

  if (seenFilter !== audienceFilter) {
    setSeenFilter(audienceFilter);
    const match = audiences.find((audience) => audience.slug === audienceFilter);
    if (match) {
      setAudienceId(match.id);
      setPhaseId(phases.find((phase) => phase.audienceId === match.id)?.id ?? "");
    }
  }

  const phaseOptions = phases.filter((phase) => phase.audienceId === audienceId);

  return (
    <form action={action} className="panel grid gap-3 p-4">
      <h2 className="serif text-xl">Marketingaufgabe</h2>
      <input type="hidden" name="weekStart" value={selectedWeek} />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="field md:col-span-2">
          Titel
          <input key={`title-${version}`} name="title" maxLength={160} required placeholder="Zum Beispiel: Fallstudie veröffentlichen" />
        </label>
        <label className="field">
          Zielgruppe
          <select
            name="audienceId"
            value={audienceId}
            onChange={(event) => {
              const nextId = event.target.value;
              setAudienceId(nextId);
              setPhaseId(phases.find((phase) => phase.audienceId === nextId)?.id ?? "");
            }}
          >
            {audiences.map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Phase
          <select name="phaseId" value={phaseId} onChange={(event) => setPhaseId(event.target.value)}>
            {phaseOptions.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Verantwortlich
          <select name="assigneeId" defaultValue={currentUserId} key={`assignee-${version}`}>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.id === currentUserId ? `${member.name} (Du)` : member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Notiz
          <input key={`notes-${version}`} name="notes" maxLength={2000} placeholder="Optional" />
        </label>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-[#8d3b24]">
          {state.error}
        </p>
      ) : null}
      <div>
        <SubmitButton pendingLabel="Legt an">In diese Woche legen</SubmitButton>
      </div>
    </form>
  );
}

function PersonalForm() {
  const [state, action] = useActionState(createPersonalTask, INITIAL);
  const [version, setVersion] = useState(0);
  const [seenState, setSeenState] = useState(state);

  if (state !== seenState) {
    setSeenState(state);
    if (state.saved) setVersion((value) => value + 1);
  }

  return (
    <form action={action} className="grid gap-3">
      <label className="field">
        Titel
        <input key={`personal-title-${version}`} name="title" maxLength={160} required placeholder="Zum Beispiel: Briefing nachziehen" />
      </label>
      <label className="field">
        Notiz
        <input key={`personal-notes-${version}`} name="notes" maxLength={2000} placeholder="Optional" />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-[#8d3b24]">
          {state.error}
        </p>
      ) : null}
      <div>
        <SubmitButton pendingLabel="Speichert">Zur Liste</SubmitButton>
      </div>
    </form>
  );
}

function planHref(week: string, audience: "all" | "kmu" | "startup") {
  const params = new URLSearchParams({ week });
  if (audience !== "all") params.set("audience", audience);
  return `/plan?${params.toString()}`;
}

function resolveDrop(
  overId: string,
  source: TaskView,
  tasks: TaskView[],
  selectedWeek: string,
): MoveInput | { error: string } | null {
  if (overId.startsWith("week:")) {
    return {
      id: source.id,
      weekStart: overId.slice("week:".length),
      status: source.weekStart ? source.status : "todo",
    };
  }
  if (overId === "inbox") {
    if (source.kind !== "personal") return { error: "Marketingaufgaben bleiben in einer Woche." };
    return { id: source.id, weekStart: null, status: "todo" };
  }
  if (overId.startsWith("status:")) {
    const status = overId.slice("status:".length);
    if (!isStatus(status)) return { error: "Unbekannter Status." };
    return { id: source.id, weekStart: selectedWeek, status };
  }
  if (overId.startsWith("task:")) {
    const target = tasks.find((task) => `task:${task.id}` === overId);
    if (!target || target.id === source.id) return null;
    if (!target.weekStart) {
      if (source.kind !== "personal") return { error: "Marketingaufgaben bleiben in einer Woche." };
      return {
        id: source.id,
        weekStart: null,
        status: target.status === "done" ? "done" : "todo",
        beforeId: target.id,
      };
    }
    return {
      id: source.id,
      weekStart: target.weekStart,
      status: target.status,
      beforeId: target.id,
    };
  }
  return null;
}

function specificity(id: string) {
  if (id.startsWith("task:")) return 3;
  if (id.startsWith("status:") || id === "inbox") return 2;
  return 1;
}
