"use client";

import { useEffect, useState } from "react";

export type SideNavItem = { id: string; label: string };

export function StickySideNav({
  items,
  activeId,
  onSelect,
  title = "On this page",
}: {
  items: SideNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  title?: string;
}) {
  return (
    <nav aria-label={title} className="space-y-1">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect?.(item.id)}
                className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                  active
                    ? "bg-panel font-medium text-accent"
                    : "text-muted hover:bg-panel hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Two-column shell: sticky left nav + scrolling right content. */
export function SideNavLayout({
  nav,
  children,
  /** When true, hide the left rail below lg (use an in-content picker instead). */
  hideNavOnMobile = false,
}: {
  nav: React.ReactNode;
  children: React.ReactNode;
  hideNavOnMobile?: boolean;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <aside
        className={`${hideNavOnMobile ? "hidden lg:block" : "mb-8 lg:mb-0"} lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto`}
      >
        {nav}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Scroll-spy sticky TOC for long documentation pages. */
export function ScrollSpyDocs({
  items,
  children,
}: {
  items: SideNavItem[];
  children: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  function onSelect(id: string) {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    }
  }

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && items.some((i) => i.id === hash)) {
      setActiveId(hash);
      window.requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ block: "start" });
      });
    }
  }, [items]);

  return (
    <SideNavLayout nav={<StickySideNav items={items} activeId={activeId} onSelect={onSelect} title="API sections" />}>
      {children}
    </SideNavLayout>
  );
}
