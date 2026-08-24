import { NextResponse } from "next/server";

async function getAdminClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || !url) {
    try {
      const cfSymbol = Symbol.for("__cloudflare-context__");
      const cfCtx = (globalThis as any)[cfSymbol];
      if (cfCtx?.env) {
        url = url || cfCtx.env.NEXT_PUBLIC_SUPABASE_URL;
        serviceKey = serviceKey || cfCtx.env.SUPABASE_SERVICE_ROLE_KEY;
      }
    } catch { /* ignore */ }
  }

  if (!serviceKey || !url) {
    try {
      const cf = await import("@opennextjs/cloudflare");
      let ctx: any = null;
      try { ctx = await cf.getCloudflareContext({ async: true }); }
      catch { ctx = (cf as any).getCloudflareContext?.(); }
      if (ctx?.env) {
        url = url || ctx.env.NEXT_PUBLIC_SUPABASE_URL;
        serviceKey = serviceKey || ctx.env.SUPABASE_SERVICE_ROLE_KEY;
      }
    } catch { /* Not in Cloudflare */ }
  }

  if (!url || !serviceKey) return null;
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, source, locale, search_criteria } = body;

    if (!email || !String(email).includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const supabase = await getAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = name ? String(name).trim() : null;
    const cleanSource = source || "Property Alerts Subscription";

    // 1. Upsert into newsletter_subscribers (graceful - table may not exist yet)
    let subscriberInserted = false;
    try {
      const { error: subErr } = await supabase
        .from("newsletter_subscribers")
        .upsert(
          {
            email: cleanEmail,
            name: cleanName,
            source: cleanSource,
            locale: locale || "en",
            search_criteria: search_criteria || null,
            subscribed_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: "email" }
        );
      if (!subErr) subscriberInserted = true;
      else console.warn("[api/subscribe] newsletter_subscribers upsert:", subErr.message);
    } catch (e) {
      console.warn("[api/subscribe] newsletter_subscribers table unavailable:", e);
    }

    // 2. Always create a lead entry so admin sees it in the CRM pipeline
    try {
      await supabase.from("leads").insert({
        name: cleanName || "Email Subscriber",
        email: cleanEmail,
        phone: "N/A - Email Only",
        source: cleanSource,
        message: search_criteria
          ? `Subscribed to property alerts. Criteria: ${search_criteria}`
          : "Opted in to receive property promotion emails and new listing alerts.",
        notes: `Locale: ${locale || "en"} | Opt-in: Email Promotions & New Listings | Subscribed: ${new Date().toISOString()}`,
        entry_method: "email_subscription",
        stage: "new",
        stage_updated_at: new Date().toISOString(),
      });
    } catch (leadErr) {
      console.warn("[api/subscribe] Lead fallback insert:", leadErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: subscriberInserted
          ? "Subscribed to property alerts and promotions"
          : "Subscription recorded in CRM",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[api/subscribe] Fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}