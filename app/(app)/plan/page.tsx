import { PlanBoard } from "@/components/plan-board";
import { requireUser } from "@/lib/auth";
import { getBoard } from "@/lib/db/queries";
import { fourWeeks } from "@/lib/weeks";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; audience?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const weeks = fourWeeks();
  const firstWeek = weeks[0];
  const lastWeek = weeks[3];
  if (!firstWeek || !lastWeek) {
    throw new Error("Das Wochenfenster konnte nicht berechnet werden.");
  }
  const requestedWeek = params.week;
  const selectedWeek =
    requestedWeek && weeks.some((week) => week.start === requestedWeek) ? requestedWeek : firstWeek.start;
  const audienceFilter = params.audience === "kmu" || params.audience === "startup" ? params.audience : "all";
  const board = await getBoard(user.id);
  const windowLabel = `${firstWeek.rangeLabel} bis ${lastWeek.rangeLabel}`;

  return (
    <div className="grid gap-5">
      <header className="max-w-3xl">
        <h1 className="serif text-4xl">Nächste 4 Wochen</h1>
        <p className="mt-2 text-muted">
          {windowLabel}. Der Filter gilt für Marketingaufgaben. Persönliche Aufgaben bleiben in deiner Ansicht.
        </p>
      </header>
      <PlanBoard
        weeks={weeks}
        selectedWeek={selectedWeek}
        audienceFilter={audienceFilter}
        audiences={board.audiences}
        phases={board.phases}
        members={board.members}
        tasks={board.tasks}
        currentUserId={user.id}
      />
    </div>
  );
}
