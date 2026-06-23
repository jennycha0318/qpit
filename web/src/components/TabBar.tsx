"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 인증/랜딩 화면에서는 탭 숨김. 그 외 앱 화면(진단·히스토리·프로필 등)에선 항상 표시.
const HIDE_ON = ["/", "/login", "/signup", "/reset-password", "/update-password", "/share"];

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
    href: "/chat",
    label: "채팅",
    icon: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
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
  if (HIDE_ON.includes(pathname)) return null;

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 left-1/2 z-20 w-full max-w-app -translate-x-1/2 border-t border-white/50 bg-white/65 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] backdrop-blur-xl"
    >
      <div className="flex px-2 pt-1.5">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-label={t.label}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span
                className={`grid h-9 w-14 place-items-center rounded-2xl transition ${
                  active ? "bg-primarySoft text-primary" : "text-muted"
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
              </span>
              <span className={`text-[12.5px] font-bold ${active ? "text-primary" : "text-muted"}`}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
