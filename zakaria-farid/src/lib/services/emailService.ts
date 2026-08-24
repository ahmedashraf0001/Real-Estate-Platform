// emailService.ts — Brevo (Sendinblue) HTTP API
// Uses pure fetch — fully compatible with Cloudflare Workers edge runtime.

// ─── Config helpers ────────────────────────────────────────────────────────────

function getBrevoKey(): string | null {
  if (process.env.BREVO_API_KEY) return process.env.BREVO_API_KEY;
  try {
    const cfSymbol = Symbol.for("__cloudflare-context__");
    const cfCtx = (globalThis as any)[cfSymbol];
    return cfCtx?.env?.BREVO_API_KEY || null;
  } catch {
    return null;
  }
}

function formatEGP(price: number): string {
  if (price >= 1_000_000) return `EGP ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `EGP ${(price / 1_000).toFixed(0)}K`;
  return `EGP ${price.toLocaleString()}`;
}

// ─── Email template ────────────────────────────────────────────────────────────

function buildPropertyAlertHtml(
  property: PropertyAlertPayload,
  recipientName?: string | null
): string {
  const siteUrl = "https://zakaria-farid.ashrafalaslogy90.workers.dev";
  const propertyUrl = property.slug
    ? `${siteUrl}/en/properties/${property.slug}`
    : siteUrl;
  const price = property.price_egp ? formatEGP(property.price_egp) : null;
  const greeting = recipientName ? `Dear ${recipientName}, a` : "A";

  const specsHtml = [
    price
      ? `<td style="padding:10px 14px;background:rgba(221,167,82,0.12);border:1px solid rgba(221,167,82,0.3);border-radius:8px;text-align:center;">
          <p style="margin:0;font-size:10px;color:#8A9BB0;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Price</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#DDA752;">${price}</p>
        </td>`
      : "",
    property.bedrooms != null
      ? `<td width="10"></td><td style="padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:8px;text-align:center;">
          <p style="margin:0;font-size:10px;color:#8A9BB0;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Beds</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#F0EDE8;">${property.bedrooms}</p>
        </td>`
      : "",
    property.area_sqm != null
      ? `<td width="10"></td><td style="padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:8px;text-align:center;">
          <p style="margin:0;font-size:10px;color:#8A9BB0;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Area</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#F0EDE8;">${property.area_sqm} m2</p>
        </td>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>New Property Alert - Al Zakaria</title>
</head>
<body style="margin:0;padding:0;background:#08090D;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#08090D">
    <tr><td align="center" style="padding:36px 12px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- Header band -->
        <tr>
          <td style="background:linear-gradient(160deg,#0E111A 0%,#141B2D 100%);border-radius:16px 16px 0 0;border:1px solid rgba(221,167,82,0.22);border-bottom:none;padding:34px 38px 26px;">
            <p style="margin:0 0 10px;font-size:10.5px;font-weight:700;letter-spacing:0.2em;color:#DDA752;text-transform:uppercase;">Private Client Alert &mdash; Al Zakaria</p>
            <h1 style="margin:0 0 10px;font-size:25px;font-weight:800;color:#F0EDE8;line-height:1.2;">New Property Available</h1>
            <p style="margin:0;font-size:14px;color:#6B7D91;line-height:1.55;">${greeting} new luxury estate has been listed on the Al Zakaria portfolio.</p>
          </td>
        </tr>

        <!-- Gold rule -->
        <tr>
          <td style="background:#141B2D;border-left:1px solid rgba(221,167,82,0.22);border-right:1px solid rgba(221,167,82,0.22);padding:0 38px;">
            <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(221,167,82,0.55),transparent);"></div>
          </td>
        </tr>

        <!-- Property body -->
        <tr>
          <td style="background:#141B2D;border-left:1px solid rgba(221,167,82,0.22);border-right:1px solid rgba(221,167,82,0.22);padding:30px 38px;">
            ${
              property.imageUrl
                ? `<div style="margin-bottom:22px;border-radius:11px;overflow:hidden;"><img src="${property.imageUrl}" width="524" alt="${property.title_en}" style="width:100%;max-width:524px;height:210px;object-fit:cover;display:block;border-radius:11px;"/></div>`
                : ""
            }

            <h2 style="margin:0 0 7px;font-size:19px;font-weight:800;color:#F0EDE8;">${property.title_en}</h2>
            ${property.location ? `<p style="margin:0 0 18px;font-size:13px;color:#DDA752;font-weight:600;">${property.location}</p>` : ""}

            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>${specsHtml}</tr>
            </table>

            ${
              property.description_en
                ? `<p style="margin:0 0 24px;font-size:14px;color:#8A9BB0;line-height:1.7;">${property.description_en.substring(0, 240)}${property.description_en.length > 240 ? "..." : ""}</p>`
                : ""
            }

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:10px;background:linear-gradient(135deg,#E8BC6A 0%,#C48E28 100%);box-shadow:0 4px 18px rgba(212,167,55,0.38);">
                  <a href="${propertyUrl}" target="_blank" style="display:inline-block;padding:13px 30px;font-size:13.5px;font-weight:800;color:#0A0B0F;text-decoration:none;letter-spacing:0.05em;">VIEW PROPERTY DETAILS</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0C0E15;border:1px solid rgba(221,167,82,0.14);border-top:none;border-radius:0 0 16px 16px;padding:22px 38px;text-align:center;">
            <p style="margin:0 0 5px;font-size:11.5px;font-weight:700;color:#DDA752;letter-spacing:0.12em;">AL ZAKARIA REAL ESTATE</p>
            <p style="margin:0 0 13px;font-size:11px;color:#3D4A58;">Grand Tower G-08, Financial District, New Cairo, Egypt</p>
            <p style="margin:0;font-size:10px;color:#2E3845;">
              You received this because you subscribed to property alerts.&nbsp;&nbsp;
              <a href="${siteUrl}" style="color:#DDA752;text-decoration:none;">Visit Website</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PropertyAlertPayload {
  title_en: string;
  title_ar?: string;
  description_en?: string;
  price_egp?: number;
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  type?: string;
  slug?: string;
  imageUrl?: string;
}

// ─── Brevo send helper ─────────────────────────────────────────────────────────

async function brevoSend(payload: Record<string, any>, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(`[emailService] Brevo error ${res.status}:`, txt);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[emailService] Brevo fetch failed:", err);
    return false;
  }
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetch all active newsletter subscribers and email each one a property alert
 * via Brevo. Fully edge-compatible (pure fetch). Non-fatal.
 */
export async function sendNewPropertyAlerts(
  supabase: any,
  property: PropertyAlertPayload
): Promise<void> {
  const apiKey = getBrevoKey();
  if (!apiKey) {
    console.warn("[emailService] BREVO_API_KEY not set — skipping property alert emails.");
    return;
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL || "ashrafalaslogy90@gmail.com";
  const fromName = process.env.BREVO_FROM_NAME || "Al Zakaria Real Estate";

  // 1. Fetch active subscribers
  let subscribers: { email: string; name: string | null }[] = [];
  try {
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("email, name")
      .eq("is_active", true);
    if (error) throw error;
    subscribers = data || [];
  } catch (e) {
    console.warn("[emailService] Could not fetch subscribers:", e);
    return;
  }

  if (subscribers.length === 0) {
    console.log("[emailService] No active subscribers — nothing to send.");
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    const html = buildPropertyAlertHtml(property, sub.name);
    const ok = await brevoSend(
      {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: sub.email, name: sub.name || undefined }],
        subject: `New Property Listed — ${property.title_en} | Al Zakaria`,
        htmlContent: html,
      },
      apiKey
    );
    if (ok) sent++;
    else failed++;
  }

  console.log(
    `[emailService] Brevo alerts: ${sent} sent, ${failed} failed / ${subscribers.length} total subscribers.`
  );
}