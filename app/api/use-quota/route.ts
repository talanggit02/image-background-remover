import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function POST(request: NextRequest) {
  try {
    const { google_id } = (await request.json()) as { google_id: string };
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

    // 检查并重置过期订阅月额度
    if (
      sub &&
      sub.status === "active" &&
      sub.renew_at &&
      (sub.renew_at as number) < now
    ) {
      await db
        .prepare("UPDATE subscriptions SET quota_used=0, renew_at=? WHERE user_id=?")
        .bind(now + 30 * 24 * 3600, user.id)
        .run();
      (sub as Record<string, unknown>).quota_used = 0;
    }

    let deductFrom: string | null = null;

    // 优先级1：赠送额度
    if ((user.gift_credits as number) > 0) {
      await db
        .prepare("UPDATE users SET gift_credits = gift_credits - 1 WHERE id = ?")
        .bind(user.id)
        .run();
      deductFrom = "gift";
    }
    // 优先级2：订阅月额度
    else if (
      sub &&
      sub.status === "active" &&
      ((sub.monthly_quota as number) - (sub.quota_used as number)) > 0
    ) {
      await db
        .prepare("UPDATE subscriptions SET quota_used = quota_used + 1 WHERE user_id = ?")
        .bind(user.id)
        .run();
      deductFrom = "subscription";
    }
    // 优先级3：积分余额
    else if (credits && (credits.credits_balance as number) > 0) {
      await db
        .prepare(
          "UPDATE user_credits SET credits_balance = credits_balance - 1, updated_at = ? WHERE user_id = ?"
        )
        .bind(now, user.id)
        .run();
      deductFrom = "credits";
    }
    // 无额度
    else {
      return NextResponse.json(
        { error: "no_quota", message: "额度不足，请充值积分或订阅套餐" },
        { status: 402, headers: corsHeaders() }
      );
    }

    // 记录使用日志
    await db
      .prepare("INSERT INTO usage_logs (user_id, deduct_from) VALUES (?, ?)")
      .bind(user.id, deductFrom)
      .run();

    return NextResponse.json(
      { success: true, deduct_from: deductFrom },
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
