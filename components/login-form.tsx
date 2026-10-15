"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

const INITIAL: FormState = { error: null };

const DEMOS = [
  ["Anna Berger", "anna@wochenplaner.local"],
  ["Ben Krüger", "ben@wochenplaner.local"],
  ["Chris Novak", "chris@wochenplaner.local"],
];

export function LoginForm() {
  const [state, action] = useActionState(login, INITIAL);

  return (
    <form action={action} className="panel grid gap-4 p-6">
      <div className="field">
        <label htmlFor="email">E-Mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Passwort</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-[#8d3b24]">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Anmeldung läuft">Anmelden</SubmitButton>
      <div className="border-t border-line pt-4 text-sm text-muted">
        <p className="font-semibold text-ink">Demo-Zugang, Passwort für alle: demo</p>
        <ul className="mt-2 grid gap-1">
          {DEMOS.map(([name, email]) => (
            <li key={email}>
              {name} · {email}
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
