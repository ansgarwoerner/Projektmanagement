import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <AppNav name={user.name} />
      <main id="inhalt" className="mx-auto w-full max-w-7xl px-4 py-6">
        {children}
      </main>
    </>
  );
}
