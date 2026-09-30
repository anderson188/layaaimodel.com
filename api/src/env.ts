export interface Env {
  DB: D1Database;
  IMPOSSIBL_API_KEY: string;
  ADMIN_TOKEN?: string;
  ADMIN_EMAILS?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SESSION_PEPPER?: string;
  UPSTREAM_MODE: string;
  SELFHOST_BASE_URL?: string;
  CREDITS_PER_INPUT_TOKEN: string;
  RATE_LIMIT_PER_MINUTE: string;
  ALERT_RATE_THRESHOLD: string;
  TOKEN_BURN_CAP_HOUR: string;
  TOKEN_BURN_CAP_DAY: string;
  API_PUBLIC_URL: string;
  SITE_URL: string;
  STRIPE_PRICE_CREDITS: string;
  DEFAULT_SIGNUP_CREDITS: string;
  RESEND_API_KEY?: string;
  /** e.g. "Laya AI <support@layaaimodel.com>" */
  RESEND_FROM?: string;
  /** Cloudflare Email Sending binding (same shape as jevtypesafe.org). */
  EMAIL?: {
    send: (msg: {
      to: string | string[];
      from: { email: string; name?: string } | string;
      replyTo?: string;
      subject: string;
      html?: string;
      text?: string;
    }) => Promise<{ messageId?: string } | void>;
  };
  EMAIL_FROM?: string;
  /** Comma-separated inbox for register/recharge/alerts (defaults to ADMIN_EMAILS, then QQ). */
  ADMIN_NOTIFY_EMAILS?: string;
}

export const ALLOWED_MODELS = {
  "convaiinnovations/laya": "convaiinnovations/laya",
  "convaiinnovations/laya-multilingual": "convaiinnovations/laya-multilingual",
  laya: "convaiinnovations/laya",
  "laya-multilingual": "convaiinnovations/laya-multilingual",
} as const;

export type AllowedModelAlias = keyof typeof ALLOWED_MODELS;

export const IMPOSSIBL_SYSTEMONE = "https://api.impossibl.com/v1/systemone";
