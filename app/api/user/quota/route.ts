import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const google_id = url.searchParams.get("google_id");
    if (!google_id) {
      return NextResponse.json(
        { error: "Missing google_id" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { env } = getRequestContext();
    const db = (env as { DB: D1Database }).DB;

    const user = (await db
      .prepare("SELECT * FROM users WHERE google_id = ?")
      .bind(google_id)
      .first()) as Record<string, unknown> | null;
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    const credits = (await db
      .prepare("SELECT credits_balance FROM user_credits WHERE user_id = ?")
      .bind(user.id)
      .first()) as Record<string, unknown> | null;
    const sub = (await db
      .prepare("SELECT * FROM subscriptions WHERE user_id = ?")
      .bind(user.id)
      .first()) as Record<string, unknown> | null;

    const now = Math.floor(Date.now() / 1000);
    let subQuotaRemaining = 0;

    if (
      sub &&
      sub.status === "active" &&
      sub.renew_at &&
      (sub.renew_at as number) < now
    ) {
      // 过期，重置月额度
      await db
        .prepare("UPDATE subscriptions SET quota_used=0, renew_at=? WHERE user_id=?")
        .bind(now + 30 * 24 * 3600, user.id)
        .run();
      subQuotaRemaining = sub.monthly_quota as number;
    } else if (sub && sub.status === "active") {
      subQuotaRemaining = Math.max(
        0,
        ((sub.monthly_quota as number) || 0) - ((sub.quota_used as number) || 0)
      );
    }

    const giftCredits = (user.gift_credits as number) || 0;
    const creditsBalance = (credits?.credits_balance as number) || 0;

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
        quota: {
          gift_credits: giftCredits,
          subscription_remaining: subQuotaRemaining,
          credits_balance: creditsBalance,
          total_remaining: giftCredits + subQuotaRemaining + creditsBalance,
          subscription: sub
            ? {
                plan: sub.plan,
                status: sub.status,
                renew_at: sub.renew_at,
              }
            : null,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
