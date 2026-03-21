// functions/api/user/history.ts
// 查询使用记录（最近50条）

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
    const user = await db.prepare("SELECT id FROM users WHERE google_id = ?").bind(google_id).first() as any;
    if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders() });

    const logs = await db.prepare(
      "SELECT id, used_at, deduct_from FROM usage_logs WHERE user_id = ? ORDER BY used_at DESC LIMIT 50"
    ).bind(user.id).all();

    return new Response(JSON.stringify({ logs: logs.results }), { headers: corsHeaders() });
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
