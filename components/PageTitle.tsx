import { SITE_TITLE } from "@/lib/site";

function TitleText({ text }: { text: string }) {
  if (text === SITE_TITLE) {
    return (
      <>
        Laya AI - Open Source System One{" "}
        <span className="whitespace-nowrap">Decision Model</span>
      </>
    );
  }
  return text;
}

export function PageTitle({
  section,
  lede,
}: {
  section?: string;
  lede?: string;
}) {
  const heading = section ?? SITE_TITLE;
  return (
    <header className="max-w-5xl">
      <p className="text-sm font-medium text-accent">Unofficial community documentation</p>
      <h1 className="mt-2 max-w-none text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
        <TitleText text={heading} />
      </h1>
      {lede ? <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">{lede}</p> : null}
    </header>
  );
}
