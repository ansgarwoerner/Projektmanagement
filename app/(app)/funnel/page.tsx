import { PhaseForm } from "@/components/phase-form";
import { requireUser } from "@/lib/auth";
import { getFunnel } from "@/lib/db/queries";

export default async function FunnelPage() {
  await requireUser();
  const { audiences, phases } = await getFunnel();

  return (
    <div className="grid gap-6">
      <header className="max-w-3xl">
        <h1 className="serif text-4xl">Funnel</h1>
        <p className="mt-2 text-muted">
          Zwei Zielgruppen, je drei Phasen. Name, Ziel, Kanäle und Kernbotschaft gelten für das ganze Team und
          strukturieren die Aufgaben der nächsten vier Wochen.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {audiences.map((audience) => (
          <section
            key={audience.id}
            className={`panel grid gap-4 p-5 ${audience.slug === "kmu" ? "audience-kmu" : "audience-startup"}`}
          >
            <div>
              <h2 className="serif text-3xl">{audience.name}</h2>
              <p className="mt-1 text-sm text-muted">{audience.description}</p>
            </div>
            {phases
              .filter((phase) => phase.audienceId === audience.id)
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((phase) => (
                <PhaseForm key={phase.id} phase={phase} />
              ))}
          </section>
        ))}
      </div>
    </div>
  );
}
