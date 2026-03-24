import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function getPayPalAccessToken(env: Record<string, string>): Promise<string> {
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;
  const baseUrl = env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

  const resp = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { order_id } = (await request.json()) as { order_id: string };

    if (!order_id) {
      return NextResponse.json(
        { error: "Missing order_id" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { env } = getRequestContext();
    const typedEnv = env as unknown as Record<string, string>;
    const db = (env as { DB: D1Database }).DB;
    const baseUrl = typedEnv.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

    const accessToken = await getPayPalAccessToken(typedEnv);

    // 捕获付款
    const captureResp = await fetch(`${baseUrl}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const capture = (await captureResp.json()) as {
      status: string;
      purchase_units: Array<{
        payments: {
          captures: Array<{ id: string; status: string }>;
        };
        custom_id: string;
      }>;
    };

    if (capture.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment not completed", status: capture.status },
        { status: 400, headers: corsHeaders() }
      );
    }

    const unit = capture.purchase_units?.[0];
    const captureId = unit?.payments?.captures?.[0]?.id;
    const customData = JSON.parse(unit?.custom_id || "{}") as {
      plan_id: string;
      google_id: string;
      credits: number;
    };

    const { google_id, credits } = customData;

    // 查找用户
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

    const now = Math.floor(Date.now() / 1000);

    // 检查是否已处理过（幂等）
    const existing = await db
      .prepare("SELECT id FROM payment_orders WHERE paypal_order_id = ?")
      .bind(order_id)
      .first();

    if (!existing) {
      // 增加积分
      await db
        .prepare(
          "UPDATE user_credits SET credits_balance = credits_balance + ?, updated_at = ? WHERE user_id = ?"
        )
        .bind(credits, now, user.id)
        .run();

      // 记录订单
      await db
        .prepare(
          "INSERT INTO payment_orders (user_id, paypal_order_id, paypal_capture_id, amount, credits, status, created_at) VALUES (?, ?, ?, ?, ?, 'completed', ?)"
        )
        .bind(user.id, order_id, captureId, credits, credits, now)
        .run();
    }

    return NextResponse.json(
      { success: true, credits_added: credits },
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
