import { logger } from "../config/logger.js";

const MAILBOXLAYER_API = "https://apilayer.net/api/check";

export type MailboxlayerResult = {
  valid: boolean;
  deliverable: boolean;
  score: number | null;
  reason?: string;
};

/** Validates email deliverability via Mailboxlayer (does not send mail). */
export const validateEmailWithMailboxlayer = async (
  email: string
): Promise<MailboxlayerResult | null> => {
  const accessKey = process.env.MAILBOXLAYER_ACCESS_KEY;
  if (!accessKey) return null;

  const url = new URL(MAILBOXLAYER_API);
  url.searchParams.set("access_key", accessKey);
  url.searchParams.set("email", email);
  url.searchParams.set("smtp", "1");
  url.searchParams.set("format", "1");

  try {
    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      format_valid?: boolean;
      mx_found?: boolean;
      smtp_check?: boolean;
      score?: number;
      did_you_mean?: string;
      error?: { info?: string };
    };

    if (!res.ok || data.error) {
      logger.warn("Mailboxlayer validation failed", {
        email,
        error: data.error?.info ?? res.statusText
      });
      return null;
    }

    const valid = Boolean(data.format_valid && data.mx_found);
    const deliverable = Boolean(valid && data.smtp_check);

    return {
      valid,
      deliverable,
      score: typeof data.score === "number" ? data.score : null,
      reason: data.did_you_mean ? `Did you mean ${data.did_you_mean}?` : undefined
    };
  } catch (error) {
    logger.warn("Mailboxlayer request error", {
      email,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
};
