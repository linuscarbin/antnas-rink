import { ENV } from "./_core/env";

/**
 * Sends an email through the Resend REST API.
 * If RESEND_API_KEY is not configured, the email is logged instead of sent,
 * so the app keeps working in dev / unconfigured deployments.
 */
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const validRecipients = recipients.filter(
    (r) => typeof r === "string" && r.includes("@")
  );

  if (validRecipients.length === 0) {
    return { sent: false, reason: "no-valid-recipients" };
  }

  if (!ENV.resendApiKey) {
    console.log(
      `[Email] RESEND_API_KEY not set — skipping send. Would have emailed: ${validRecipients.join(
        ", "
      )} | Subject: ${params.subject}`
    );
    return { sent: false, reason: "not-configured" };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ENV.mailFrom,
        to: validRecipients,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => resp.statusText);
      console.warn(`[Email] Resend failed (${resp.status}): ${detail}`);
      return { sent: false, reason: `resend-error-${resp.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.warn("[Email] Error calling Resend:", error);
    return { sent: false, reason: "exception" };
  }
}

/** Minimal HTML wrapper for branded emails. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:#0d9488;color:#ffffff;padding:20px 24px;border-radius:16px 16px 0 0;font-weight:800;font-size:20px;letter-spacing:-0.5px;">
      Antnäs Hockeyrink
    </div>
    <div style="background:#ffffff;padding:24px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
      <h1 style="font-size:18px;margin:0 0 12px;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="color:#94a3b8;font-size:12px;margin-top:16px;text-align:center;">
      Detta är ett automatiskt meddelande från Antnäs Hockeyrink.
    </p>
  </div></body></html>`;
}
