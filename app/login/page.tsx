import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/plan");

  return (
    <main id="inhalt" className="mx-auto grid min-h-screen w-full max-w-lg content-center gap-6 px-4 py-12">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal">Marketingteam</p>
        <h1 className="serif mt-2 text-5xl">Wochenplaner</h1>
        <p className="mt-3 text-muted">
          Funnel für KMU und Startup festlegen, die nächsten vier Wochen im Kanban planen und eigene Aufgaben
          dazwischen schieben.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
