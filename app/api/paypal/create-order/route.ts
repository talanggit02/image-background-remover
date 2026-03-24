import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// 积分包配置
const CREDITS_PLANS: Record<string, { credits: number; amount: string; name: string }> = {
  starter: { credits: 5, amount: "1.90", name: "入门包 - 5次积分" },
  standard: { credits: 15, amount: "4.90", name: "标准包 - 15次积分" },
  large: { credits: 35, amount: "9.90", name: "大包 - 35次积分" },
};

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
    const { plan_id, google_id } = (await request.json()) as {
      plan_id: string;
      google_id: string;
    };

    if (!plan_id || !google_id) {
      return NextResponse.json(
        { error: "Missing plan_id or google_id" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const plan = CREDITS_PLANS[plan_id];
    if (!plan) {
      return NextResponse.json(
        { error: "Invalid plan_id" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { env } = getRequestContext();
    const typedEnv = env as unknown as Record<string, string>;
    const baseUrl = typedEnv.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const siteUrl = typedEnv.NEXT_PUBLIC_SITE_URL || "https://image-background-remover.site";

    const accessToken = await getPayPalAccessToken(typedEnv);

    const orderResp = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: `${plan_id}_${google_id}_${Date.now()}`,
            description: plan.name,
            amount: {
              currency_code: "USD",
              value: plan.amount,
            },
            custom_id: JSON.stringify({ plan_id, google_id, credits: plan.credits }),
          },
        ],
        application_context: {
          brand_name: "BGRemover",
          return_url: `${siteUrl}/payment/success?type=credits&plan=${plan_id}`,
          cancel_url: `${siteUrl}/pricing`,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      }),
    });

    const order = (await orderResp.json()) as { id: string; links: Array<{ rel: string; href: string }> };

    const approveLink = order.links?.find((l) => l.rel === "approve")?.href;

    return NextResponse.json(
      { order_id: order.id, approve_url: approveLink },
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
