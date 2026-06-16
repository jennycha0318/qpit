"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  {
    href: "/diagnose",
    label: "진단",
    icon: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4h6v2H9z" />
        <path d="M8.5 13l2 2 4-4.5" />
      </>
    ),
  },
  {
    href: "/history",
    label: "히스토리",
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </>
    ),
  },
  {
    href: "/profile",
    label: "프로필",
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
      </>
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setAuthed(!!user)).catch(() => setAuthed(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session?.user));
    return () => subscription.unsubscribe();
  }, []);

  if (!authed) return null;

  return (
    <nav aria-label="주요 메뉴" className="fixed bottom-0 left-1/2 z-20 w-full max-w-app -translate-x-1/2 border-t border-line bg-surface/95 backdrop-blur">
      <div className="flex">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-label={t.label}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 2 : 1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {t.icon}
              </svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
