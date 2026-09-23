import { SITE_TITLE } from "@/lib/site";

export function PageTitle({
  section,
  lede,
}: {
  section?: string;
  lede?: string;
}) {
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-medium text-accent">Unofficial community documentation</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {SITE_TITLE}
      </h1>
      {section ? <h2 className="mt-4 text-xl font-medium text-ink">{section}</h2> : null}
      {lede ? <p className="mt-4 text-base leading-relaxed text-muted">{lede}</p> : null}
    </header>
  );
}
