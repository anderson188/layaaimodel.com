"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { openAuthModal } from "@/components/AuthModal";
import { apiFetch, SESSION_KEY } from "@/lib/apiClient";
import { NAV } from "@/lib/site";

function isCurrent(pathname: string, href: string) {
  const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  const target = href.endsWith("/") && href !== "/" ? href.slice(0, -1) : href;
  return path === target;
}

export function Header() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const token = window.localStorage.getItem(SESSION_KEY);
      if (!token) {
        if (!cancelled) {
          setAuthed(false);
          setEmail(null);
          setIsAdmin(false);
        }
        return;
      }
      const me = await apiFetch<{ user: { email: string; is_admin?: boolean } }>("/v1/me", { token });
      if (cancelled) return;
      if (me.ok) {
        setAuthed(true);
        setEmail(me.data.user.email);
        setIsAdmin(!!me.data.user.is_admin);
      } else {
        window.localStorage.removeItem(SESSION_KEY);
        setAuthed(false);
        setEmail(null);
        setIsAdmin(false);
      }
    }
    void sync();
    function onStorage(e: StorageEvent) {
      if (e.key === SESSION_KEY) void sync();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("laya-auth-changed", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("laya-auth-changed", sync);
    };
  }, [pathname]);

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  const navItems = NAV;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight text-ink">
          <img src="/official/logo-mark.svg" alt="" width={28} height={28} className="h-7 w-7" />
          <span>Laya AI</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <nav aria-label="Primary" className="min-w-0">
            <ul className="hidden items-center gap-0.5 lg:flex">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                    className="block rounded-md px-2 py-1.5 text-xs font-medium text-ink hover:bg-panel aria-[current=page]:bg-panel aria-[current=page]:text-accent sm:text-sm"
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
              <ul className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-line bg-panel p-2 shadow-sm">
                {navItems.map((item) => (
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
                <li className="my-1 border-t border-line" />
                {authed ? (
                  <>
                    {isAdmin ? (
                      <li>
                        <Link
                          href="/admin/"
                          onClick={closeMenu}
                          className="block rounded-md px-2.5 py-1.5 text-sm font-medium text-accent"
                        >
                          Admin
                        </Link>
                      </li>
                    ) : null}
                    <li>
                      <Link
                        href="/account/"
                        onClick={closeMenu}
                        className="block rounded-md px-2.5 py-1.5 text-sm font-medium text-accent"
                      >
                        Account
                      </Link>
                    </li>
                  </>
                ) : (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        openAuthModal("login");
                      }}
                      className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-accent"
                    >
                      Sign in
                    </button>
                  </li>
                )}
              </ul>
            </details>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {authed ? (
              <>
                {isAdmin ? (
                  <Link
                    href="/admin/"
                    className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-accent"
                  >
                    Admin
                  </Link>
                ) : null}
                <Link
                  href="/account/"
                  className="max-w-[10rem] truncate rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium text-ink hover:border-accent"
                  title={email ?? "Account"}
                >
                  {email ?? "Account"}
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
