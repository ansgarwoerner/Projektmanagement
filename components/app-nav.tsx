"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";

const LINKS = [
  { href: "/plan", label: "Plan" },
  { href: "/funnel", label: "Funnel" },
];

export function AppNav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/plan" className="serif text-xl text-white">
          Wochenplaner
        </Link>
        <nav className="flex items-center gap-1" aria-label="Hauptnavigation">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  active ? "bg-white text-teal-deep" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <form action={logout} className="ml-auto flex items-center gap-3">
          <span className="text-sm text-white/75">{name}</span>
          <button className="btn bg-white/10 text-white hover:bg-white/20" type="submit">
            Abmelden
          </button>
        </form>
      </div>
    </header>
  );
}
