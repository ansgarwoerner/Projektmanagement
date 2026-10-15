"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
