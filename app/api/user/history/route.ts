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
      .prepare("SELECT id FROM users WHERE google_id = ?")
      .bind(google_id)
      .first()) as Record<string, unknown> | null;
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    const logs = await db
      .prepare(
        "SELECT id, used_at, deduct_from FROM usage_logs WHERE user_id = ? ORDER BY used_at DESC LIMIT 50"
      )
      .bind(user.id)
      .all();

    return NextResponse.json({ logs: logs.results }, { headers: corsHeaders() });
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
