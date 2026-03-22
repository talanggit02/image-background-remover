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
    const { credential } = (await request.json()) as { credential: string };
    if (!credential) {
      return NextResponse.json(
        { error: "Missing credential" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 解析 Google JWT payload（不验签，生产环境建议验签）
    const payload = JSON.parse(atob(credential.split(".")[1]));
    const { sub: google_id, email, name, picture } = payload;

    const { env } = getRequestContext();
    const db = (env as { DB: D1Database }).DB;

    // 查找用户
    let user = await db
      .prepare("SELECT * FROM users WHERE google_id = ?")
      .bind(google_id)
      .first();

    if (!user) {
      // 新用户：插入，默认 gift_credits=3
      const result = await db
        .prepare(
          "INSERT INTO users (email, google_id, name, picture, gift_credits) VALUES (?, ?, ?, ?, 3)"
        )
        .bind(email, google_id, name, picture)
        .run();

      const userId = result.meta.last_row_id;

      // 初始化积分和订阅记录
      await db
        .prepare("INSERT INTO user_credits (user_id, credits_balance) VALUES (?, 0)")
        .bind(userId)
        .run();
      await db
        .prepare("INSERT INTO subscriptions (user_id) VALUES (?)")
        .bind(userId)
        .run();

      user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
    } else {
      // 老用户：更新头像和名字
      await db
        .prepare("UPDATE users SET name=?, picture=? WHERE google_id=?")
        .bind(name, picture, google_id)
        .run();
    }

    return NextResponse.json({ success: true, user }, { headers: corsHeaders() });
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
