"use client";

import { useState } from "react";

interface ToastState {
  msg: string;
  show: boolean;
}

const CREDITS_PLANS = [
  { key: "starter", name: "入门包", price: "$1.9", count: 5, unit: "$0.38/次", popular: false },
  { key: "standard", name: "标准包", price: "$4.9", count: 15, unit: "$0.33/次", popular: false },
  { key: "large", name: "大包", price: "$9.9", count: 35, unit: "$0.28/次", popular: true },
];

const SUB_PLANS = [
  {
    key: "basic",
    name: "基础版",
    price: "$4.9",
    period: "/月",
    count: "20次/月",
    yearly: "年付 $47.0（8折）",
    features: ["每月20次抠图", "优先处理队列", "邮件支持"],
    color: "#f8fafc",
    textColor: "#1e293b",
    btnColor: "#7c3aed",
    popular: false,
  },
  {
    key: "pro",
    name: "专业版",
    price: "$12.9",
    period: "/月",
    count: "60次/月",
    yearly: "年付 $123.8（8折）",
    features: ["每月60次抠图", "优先处理队列", "在线客服支持", "API接口访问"],
    color: "linear-gradient(135deg, #7c3aed, #6366f1)",
    textColor: "#fff",
    btnColor: "rgba(255,255,255,0.2)",
    popular: true,
  },
  {
    key: "enterprise",
    name: "企业版",
    price: "$39.9",
    period: "/月",
    count: "200次/月",
    yearly: "年付 $383.0（8折）",
    features: ["每月200次抠图", "最高优先处理", "专属客服", "完整API接口", "商业使用授权"],
    color: "#f8fafc",
    textColor: "#1e293b",
    btnColor: "#7c3aed",
    popular: false,
  },
];

export default function PricingPage() {
  const [toast, setToast] = useState<ToastState>({ msg: "", show: false });
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast({ msg: "", show: false }), 3000);
  };

  const getGoogleId = (): string | null => {
    return localStorage.getItem("google_id");
  };

  const handleBuyCredits = async (planKey: string) => {
    const googleId = getGoogleId();
    if (!googleId) {
      showToast("请先登录后再购买 🔒");
      return;
    }

    setLoading(planKey);
    try {
      const resp = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planKey, google_id: googleId }),
      });
      const data = await resp.json() as { approve_url?: string; error?: string };

      if (data.approve_url) {
        window.location.href = data.approve_url;
      } else {
        showToast(data.error || "创建订单失败，请重试");
      }
    } catch {
      showToast("网络错误，请重试");
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribe = async (planKey: string) => {
    const googleId = getGoogleId();
    if (!googleId) {
      showToast("请先登录后再订阅 🔒");
      return;
    }

    setLoading(`sub_${planKey}`);
    try {
      const resp = await fetch("/api/paypal/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planKey,
          billing_cycle: billingCycle,
          google_id: googleId,
        }),
      });
      const data = await resp.json() as { approve_url?: string; error?: string };

      if (data.approve_url) {
        window.location.href = data.approve_url;
      } else {
        showToast(data.error || "创建订阅失败，请重试");
      }
    } catch {
      showToast("网络错误，请重试");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Toast */}
      {toast.show && (
        <div style={{ position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1e293b", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}>
          {toast.msg}
        </div>
      )}

      {/* 顶部导航 */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e8ecf4", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14 }}>B</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>BGRemover</span>
        </a>
        <a href="/" style={{ fontSize: 14, color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>← 返回首页</a>
      </nav>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 20px" }}>
        {/* 标题 */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: "#1e293b", margin: "0 0 12px" }}>简单透明的定价</h1>
          <p style={{ fontSize: 16, color: "#64748b", margin: "0 0 28px" }}>注册即送 3 次免费额度，按需购买或订阅套餐</p>
          {/* 切换月付/年付 */}
          <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: 12, padding: 4 }}>
            {(["monthly", "yearly"] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                style={{
                  padding: "8px 22px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  background: billingCycle === cycle ? "#fff" : "transparent",
                  color: billingCycle === cycle ? "#7c3aed" : "#64748b",
                  boxShadow: billingCycle === cycle ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {cycle === "monthly" ? "月付" : "年付"}
                {cycle === "yearly" && <span style={{ marginLeft: 6, background: "#fef3c7", color: "#d97706", fontSize: 11, padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>8折</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 积分包 */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed", background: "#faf5ff", padding: "4px 16px", borderRadius: 20, border: "1px solid #ede9fe" }}>🔥 积分包（一次性购买，永久有效）</span>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {CREDITS_PLANS.map((plan) => (
              <div key={plan.key} style={{ background: "#fff", borderRadius: 18, padding: "24px 20px", boxShadow: plan.popular ? "0 8px 32px rgba(124,58,237,0.18)" : "0 4px 16px rgba(0,0,0,0.06)", border: plan.popular ? "2px solid #7c3aed" : "1px solid #e8ecf4", position: "relative", textAlign: "center" }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 20 }}>最划算</div>
                )}
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{plan.name}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#7c3aed", lineHeight: 1, marginBottom: 4 }}>{plan.price}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", margin: "8px 0 4px" }}>{plan.count} 次</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>{plan.unit}</div>
                <button
                  onClick={() => handleBuyCredits(plan.key)}
                  disabled={loading === plan.key}
                  style={{ width: "100%", padding: "11px 0", background: plan.popular ? "linear-gradient(135deg, #7c3aed, #6366f1)" : "#fff", color: plan.popular ? "#fff" : "#7c3aed", border: "2px solid #7c3aed", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading === plan.key ? "wait" : "pointer", opacity: loading === plan.key ? 0.7 : 1 }}
                >
                  {loading === plan.key ? "跳转中..." : "立即购买"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 订阅套餐 */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed", background: "#faf5ff", padding: "4px 16px", borderRadius: 20, border: "1px solid #ede9fe" }}>📦 订阅套餐（每月重置额度）</span>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {SUB_PLANS.map((plan) => (
              <div key={plan.key} style={{ background: plan.color, borderRadius: 18, padding: "28px 22px", boxShadow: plan.popular ? "0 8px 32px rgba(124,58,237,0.22)" : "0 4px 16px rgba(0,0,0,0.06)", border: plan.popular ? "none" : "1px solid #e8ecf4", position: "relative" }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#fff", color: "#7c3aed", fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>🔥 最受欢迎</div>
                )}
                <div style={{ fontSize: 15, fontWeight: 700, color: plan.popular ? "rgba(255,255,255,0.85)" : "#64748b", marginBottom: 8 }}>{plan.name}</div>
                <div>
                  <span style={{ fontSize: 36, fontWeight: 900, color: plan.popular ? "#fff" : "#1e293b", lineHeight: 1 }}>
                    {billingCycle === "yearly" ? `$${(parseFloat(plan.price.replace("$", "")) * 0.8).toFixed(1)}` : plan.price}
                  </span>
                  <span style={{ fontSize: 14, color: plan.popular ? "rgba(255,255,255,0.6)" : "#94a3b8" }}>{plan.period}</span>
                </div>
                {billingCycle === "yearly" && (
                  <div style={{ fontSize: 11, color: plan.popular ? "rgba(255,255,255,0.6)" : "#94a3b8", marginTop: 2 }}>{plan.yearly}</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, color: plan.popular ? "rgba(255,255,255,0.9)" : "#7c3aed", margin: "10px 0 16px" }}>{plan.count}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ fontSize: 13, color: plan.popular ? "rgba(255,255,255,0.85)" : "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: plan.popular ? "#a78bfa" : "#7c3aed", fontWeight: 700 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={loading === `sub_${plan.key}`}
                  style={{ width: "100%", padding: "12px 0", background: plan.popular ? "rgba(255,255,255,0.2)" : "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff", border: plan.popular ? "1px solid rgba(255,255,255,0.3)" : "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading === `sub_${plan.key}` ? "wait" : "pointer", opacity: loading === `sub_${plan.key}` ? 0.7 : 1 }}
                >
                  {loading === `sub_${plan.key}` ? "跳转中..." : "立即订阅"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: "0 0 20px", textAlign: "center" }}>常见问题</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { q: "积分会过期吗？", a: "不会。一次性购买的积分包永久有效，不设使用期限。" },
              { q: "订阅套餐的额度怎么算？", a: "订阅套餐的额度每月重置，未使用的额度不会累积到下个月。" },
              { q: "支持哪些支付方式？", a: "支持 PayPal 支付，可绑定信用卡、借记卡或 PayPal 余额付款。" },
              { q: "免费赠送的 3 次用完了怎么办？", a: "购买积分包或订阅套餐后可继续使用，积分包是一次性买断，套餐是按月订阅。" },
            ].map((item, i) => (
              <div key={i} style={{ padding: "14px 18px", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Q: {item.q}</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>A: {item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
