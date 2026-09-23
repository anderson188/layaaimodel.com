"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { NAV } from "@/lib/site";

function isCurrent(pathname: string, href: string) {
  const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  const target = href.endsWith("/") && href !== "/" ? href.slice(0, -1) : href;
  return path === target;
}

export function Header() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-ink">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#1b1f1c" />
            <path d="M9 7h9.2a6.2 6.2 0 0 1 0 12.4H9V7Z" fill="none" stroke="#3dbe98" strokeWidth="2" />
            <path d="M9 13.2h7.2" stroke="#3dbe98" strokeWidth="2" />
          </svg>
          <span>Laya AI</span>
        </Link>
        <nav aria-label="Primary">
          <ul className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                  className="block rounded-md px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-panel aria-[current=page]:bg-panel aria-[current=page]:text-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <details ref={menuRef} className="relative lg:hidden">
            <summary className="cursor-pointer list-none rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-medium">
              Menu
            </summary>
            <ul className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-line bg-panel p-2 shadow-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                    className="block rounded-md px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-paper aria-[current=page]:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </nav>
      </div>
    </header>
  );
}
