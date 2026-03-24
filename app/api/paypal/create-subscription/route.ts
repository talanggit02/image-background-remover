import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// 套餐配置（不含 Plan ID，Plan ID 从 Cloudflare env 变量读取）
const SUB_PLAN_CONFIG: Record<string, { monthly_quota: number; name: string }> = {
  basic: { monthly_quota: 20, name: "基础版" },
  pro: { monthly_quota: 60, name: "专业版" },
  enterprise: { monthly_quota: 200, name: "企业版" },
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
    const { plan_id, billing_cycle, google_id } = (await request.json()) as {
      plan_id: string;
      billing_cycle: "monthly" | "yearly";
      google_id: string;
    };

    if (!plan_id || !google_id || !billing_cycle) {
      return NextResponse.json(
        { error: "Missing plan_id, billing_cycle or google_id" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const planConfig = SUB_PLAN_CONFIG[plan_id];
    if (!planConfig) {
      return NextResponse.json(
        { error: "Invalid plan_id" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { env } = getRequestContext();
    const typedEnv = env as unknown as Record<string, string>;
    const baseUrl = typedEnv.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const siteUrl = typedEnv.NEXT_PUBLIC_SITE_URL || "https://image-background-remover.site";

    // 从 Cloudflare env 读取 Plan ID
    const planIdKey = `PAYPAL_PLAN_${plan_id.toUpperCase()}_${billing_cycle.toUpperCase()}`;
    const paypalPlanId = typedEnv[planIdKey];

    if (!paypalPlanId) {
      return NextResponse.json(
        { error: `PayPal plan not configured: ${planIdKey}` },
        { status: 503, headers: corsHeaders() }
      );
    }

    const accessToken = await getPayPalAccessToken(typedEnv);

    const subResp = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        custom_id: JSON.stringify({
          plan_id,
          billing_cycle,
          google_id,
          monthly_quota: planConfig.monthly_quota,
        }),
        application_context: {
          brand_name: "BGRemover",
          return_url: `${siteUrl}/payment/success?type=subscription&plan=${plan_id}&cycle=${billing_cycle}`,
          cancel_url: `${siteUrl}/pricing`,
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
        },
      }),
    });

    const sub = (await subResp.json()) as {
      id: string;
      links: Array<{ rel: string; href: string }>;
    };

    const approveLink = sub.links?.find((l) => l.rel === "approve")?.href;

    return NextResponse.json(
      { subscription_id: sub.id, approve_url: approveLink },
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
