import type { Env } from "./env";

/** Domains that can receive public/throwaway mail or are reserved for tests. */
const BLOCKED_EMAIL_DOMAINS = new Set([
  "layaaimodel.com",
  "example.com",
  "example.org",
  "example.net",
  "mailinator.com",
  "mailinator.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "tempmail.com",
  "temp-mail.org",
  "tempmailo.com",
  "10minutemail.com",
  "10minutemail.net",
  "yopmail.com",
  "yopmail.fr",
  "trashmail.com",
  "trashmail.me",
  "discard.email",
  "mailnesia.com",
  "maildrop.cc",
  "getnada.com",
  "emailondeck.com",
  "throwaway.email",
  "fakeinbox.com",
  "mintemail.com",
  "moakt.com",
  "tmpmail.org",
  "tmpmail.net",
  "tmpeml.com",
  "dispostable.com",
  "mailcatch.com",
  "inboxkitten.com",
  "test.com",
  "test.org",
  "localhost",
  "localdomain",
  "invalid",
]);

function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .map((e) => e.replace(/^.*<([^>]+)>.*$/, "$1").trim());
}

/** Owner / admin / notify addresses that must never be used for public signup. */
export function reservedOwnerEmails(env: Env): Set<string> {
  const set = new Set<string>([
    ...parseEmailList(env.ADMIN_EMAILS),
    ...parseEmailList(env.ADMIN_NOTIFY_EMAILS),
    ...parseEmailList(env.EMAIL_FROM),
    "support@layaaimodel.com",
    "2420133012@qq.com",
  ]);
  return set;
}

export function isBlockedSignupEmail(email: string, env?: Env): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 0) return true;
  if (env && reservedOwnerEmails(env).has(normalized)) return true;
  const domain = normalized.slice(at + 1);
  if (!domain || BLOCKED_EMAIL_DOMAINS.has(domain)) return true;
  // block mailinator-style subdomains e.g. foo.mailinator.com
  for (const blocked of BLOCKED_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

export const FORBIDDEN_EMAIL_MESSAGE =
  "Don't mess around. Use your own email — not a reserved, fake, or disposable address.";
