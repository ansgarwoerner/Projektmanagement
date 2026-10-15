"use client";

import { useActionState } from "react";
import { updatePhase, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import type { PhaseView } from "@/lib/types";

const INITIAL: FormState = { error: null };

export function PhaseForm({ phase }: { phase: PhaseView }) {
  const [state, action] = useActionState(updatePhase, INITIAL);

  return (
    <form action={action} className="grid gap-3 rounded-xl border border-line bg-white/70 p-4">
      <input type="hidden" name="id" value={phase.id} />
      <div className="flex items-center gap-3">
        <span className="serif grid h-9 w-9 place-items-center rounded-full bg-teal-deep text-sm text-white">
          {phase.sortOrder}
        </span>
        <div className="field min-w-0 flex-1">
          <label htmlFor={`${phase.id}-name`}>Name</label>
          <input id={`${phase.id}-name`} name="name" defaultValue={phase.name} maxLength={80} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${phase.id}-goal`}>Ziel</label>
        <textarea id={`${phase.id}-goal`} name="goal" defaultValue={phase.goal} maxLength={500} rows={2} />
      </div>
      <div className="field">
        <label htmlFor={`${phase.id}-channels`}>Kanäle</label>
        <input id={`${phase.id}-channels`} name="channels" defaultValue={phase.channels} maxLength={240} />
      </div>
      <div className="field">
        <label htmlFor={`${phase.id}-message`}>Kernbotschaft</label>
        <textarea id={`${phase.id}-message`} name="message" defaultValue={phase.message} maxLength={500} rows={2} />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-[#8d3b24]">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm font-medium text-teal">
          Gespeichert
        </p>
      ) : null}
      <div>
        <SubmitButton pendingLabel="Speichert">Phase speichern</SubmitButton>
      </div>
    </form>
  );
}
