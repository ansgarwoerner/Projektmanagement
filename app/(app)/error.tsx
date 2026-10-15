"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="panel max-w-lg p-6">
      <h1 className="serif text-3xl">Etwas ist schiefgelaufen</h1>
      <p className="mt-2 text-muted">Die Seite konnte nicht geladen werden. Bitte versuche es erneut.</p>
      <button className="btn btn-primary mt-4" type="button" onClick={reset}>
        Erneut versuchen
      </button>
    </div>
  );
}
