// functions/api/auth/sync.ts
// 用户登录后同步到D1，首次注册送3次赠送额度

interface Env {
  DB: D1Database;
}

interface GooglePayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const { credential } = await ctx.request.json() as { credential: string };
    if (!credential) return new Response(JSON.stringify({ error: "Missing credential" }), { status: 400, headers: corsHeaders });

    // 解析 Google JWT（只取 payload，不验签——生产环境建议验签）
    const payload = JSON.parse(atob(credential.split(".")[1])) as GooglePayload;
    const { sub: google_id, email, name, picture } = payload;

    const db = ctx.env.DB;

    // 查找或创建用户
    let user = await db.prepare("SELECT * FROM users WHERE google_id = ?").bind(google_id).first();

    if (!user) {
      // 新用户：插入，默认 gift_credits=3
      const result = await db.prepare(
        "INSERT INTO users (email, google_id, name, picture, gift_credits) VALUES (?, ?, ?, ?, 3)"
      ).bind(email, google_id, name, picture).run();

      const userId = result.meta.last_row_id;

      // 初始化积分和订阅记录
      await db.prepare("INSERT INTO user_credits (user_id, credits_balance) VALUES (?, 0)").bind(userId).run();
      await db.prepare("INSERT INTO subscriptions (user_id) VALUES (?)").bind(userId).run();

      user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
    } else {
      // 老用户：更新头像和名字
      await db.prepare("UPDATE users SET name=?, picture=? WHERE google_id=?").bind(name, picture, google_id).run();
    }

    return new Response(JSON.stringify({ success: true, user }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
