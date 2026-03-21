// functions/api/user/quota.ts
// 查询当前用户额度状态

interface Env {
  DB: D1Database;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const google_id = url.searchParams.get("google_id");
    if (!google_id) return new Response(JSON.stringify({ error: "Missing google_id" }), { status: 400, headers: corsHeaders() });

    const db = ctx.env.DB;
    const user = await db.prepare("SELECT * FROM users WHERE google_id = ?").bind(google_id).first() as any;
    if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders() });

    const credits = await db.prepare("SELECT credits_balance FROM user_credits WHERE user_id = ?").bind(user.id).first() as any;
    const sub = await db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").bind(user.id).first() as any;

    // 检查订阅是否过期，若过期重置
    const now = Math.floor(Date.now() / 1000);
    let subQuotaRemaining = 0;
    if (sub && sub.status === "active" && sub.renew_at && sub.renew_at < now) {
      // 过期，重置月额度
      await db.prepare("UPDATE subscriptions SET quota_used=0, renew_at=? WHERE user_id=?")
        .bind(now + 30 * 24 * 3600, user.id).run();
      subQuotaRemaining = sub.monthly_quota;
    } else if (sub && sub.status === "active") {
      subQuotaRemaining = Math.max(0, (sub.monthly_quota || 0) - (sub.quota_used || 0));
    }

    return new Response(JSON.stringify({
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
      quota: {
        gift_credits: user.gift_credits,
        subscription_remaining: subQuotaRemaining,
        credits_balance: credits?.credits_balance || 0,
        total_remaining: user.gift_credits + subQuotaRemaining + (credits?.credits_balance || 0),
        subscription: sub ? { plan: sub.plan, status: sub.status, renew_at: sub.renew_at } : null,
      }
    }), { headers: corsHeaders() });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders() });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
