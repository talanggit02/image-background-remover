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

async function verifyWebhookSignature(
  env: Record<string, string>,
  headers: Headers,
  body: string
): Promise<boolean> {
  const baseUrl = env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
  const webhookId = env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) return true; // 开发阶段跳过验证

  const accessToken = await getPayPalAccessToken(env);

  const verifyResp = await fetch(
    `${baseUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    }
  );

  const result = (await verifyResp.json()) as { verification_status: string };
  return result.verification_status === "SUCCESS";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const { env } = getRequestContext();
    const typedEnv = env as unknown as Record<string, string>;
    const db = (env as { DB: D1Database }).DB;

    // 验证 Webhook 签名
    const isValid = await verifyWebhookSignature(typedEnv, request.headers, body);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body) as {
      event_type: string;
      resource: Record<string, unknown>;
    };

    const now = Math.floor(Date.now() / 1000);

    // 处理积分包付款完成
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event.resource;
      const orderId = resource.supplementary_data
        ? (resource.supplementary_data as Record<string, unknown>)
        : null;

      // 从 custom_id 解析
      const customId = (resource.custom_id as string) || "";
      if (!customId) {
        return NextResponse.json({ received: true });
      }

      const customData = JSON.parse(customId) as {
        plan_id: string;
        google_id: string;
        credits: number;
      };

      const { google_id, credits } = customData;
      const captureId = resource.id as string;

      const user = (await db
        .prepare("SELECT * FROM users WHERE google_id = ?")
        .bind(google_id)
        .first()) as Record<string, unknown> | null;

      if (user) {
        // 幂等处理
        const existing = await db
          .prepare("SELECT id FROM payment_orders WHERE paypal_capture_id = ?")
          .bind(captureId)
          .first();

        if (!existing) {
          await db
            .prepare(
              "UPDATE user_credits SET credits_balance = credits_balance + ?, updated_at = ? WHERE user_id = ?"
            )
            .bind(credits, now, user.id)
            .run();

          await db
            .prepare(
              "INSERT INTO payment_orders (user_id, paypal_capture_id, credits, status, created_at) VALUES (?, ?, ?, 'completed', ?)"
            )
            .bind(user.id, captureId, credits, now)
            .run();
        }
      }
    }

    // 处理订阅激活
    if (
      event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED" ||
      event.event_type === "BILLING.SUBSCRIPTION.RENEWED"
    ) {
      const resource = event.resource;
      const subscriptionId = resource.id as string;
      const customId = (resource.custom_id as string) || "{}";

      const customData = JSON.parse(customId) as {
        plan_id: string;
        google_id: string;
        billing_cycle: string;
        monthly_quota: number;
      };

      const { google_id, monthly_quota } = customData;

      const user = (await db
        .prepare("SELECT * FROM users WHERE google_id = ?")
        .bind(google_id)
        .first()) as Record<string, unknown> | null;

      if (user) {
        if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
          // 新订阅激活
          await db
            .prepare(
              `UPDATE subscriptions SET 
                status='active', 
                paypal_subscription_id=?, 
                monthly_quota=?, 
                quota_used=0, 
                renew_at=? 
              WHERE user_id=?`
            )
            .bind(subscriptionId, monthly_quota, now + 30 * 24 * 3600, user.id)
            .run();
        } else {
          // 订阅续期，重置额度
          await db
            .prepare(
              `UPDATE subscriptions SET 
                quota_used=0, 
                renew_at=? 
              WHERE user_id=? AND paypal_subscription_id=?`
            )
            .bind(now + 30 * 24 * 3600, user.id, subscriptionId)
            .run();
        }
      }
    }

    // 处理订阅取消
    if (event.event_type === "BILLING.SUBSCRIPTION.CANCELLED") {
      const resource = event.resource;
      const subscriptionId = resource.id as string;

      await db
        .prepare("UPDATE subscriptions SET status='cancelled' WHERE paypal_subscription_id=?")
        .bind(subscriptionId)
        .run();
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
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
