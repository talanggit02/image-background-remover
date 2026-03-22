"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const GOOGLE_CLIENT_ID = "895765422209-rla06a14hk41iogec73qml1vlooo9g2f.apps.googleusercontent.com";

interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  google_id: string;
}

interface QuotaInfo {
  gift_credits: number;
  subscription_remaining: number;
  credits_balance: number;
  total_remaining: number;
  subscription: { plan: string; status: string; renew_at: number } | null;
}

interface UsageLog {
  id: number;
  used_at: number;
  deduct_from: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("bgremover_user");
    if (!stored) {
      router.push("/");
      return;
    }
    const u = JSON.parse(stored) as GoogleUser;
    setUser(u);

    // 获取额度
    fetch(`/api/user/quota?google_id=${encodeURIComponent(u.google_id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.quota) setQuota(data.quota);
      });

    // 获取使用记录
    fetch(`/api/user/history?google_id=${encodeURIComponent(u.google_id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs);
        setLoading(false);
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("bgremover_user");
    window.google?.accounts.id.disableAutoSelect();
    router.push("/");
  };

  const deductLabel: Record<string, string> = {
    gift: "🎁 赠送额度",
    subscription: "📦 订阅套餐",
    credits: "💎 积分余额",
  };

  const planLabel: Record<string, string> = {
    none: "免费版",
    basic: "基础版",
    pro: "专业版",
    enterprise: "企业版",
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* 顶部导航 */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e8ecf4", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14 }}>B</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>BGRemover</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={user.picture} alt={user.name} style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #e2e8f0" }} />
          <span style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>{user.name}</span>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>
        {/* 用户信息卡片 */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 28, marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
            <img src={user.picture} alt={user.name} style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid #e2e8f0" }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>{user.name}</div>
              <div style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>{user.email}</div>
              <div style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", background: "#f1f5f9", borderRadius: 20, fontSize: 12, color: "#475569", fontWeight: 600 }}>
                {quota ? planLabel[quota.subscription?.plan || "none"] : "免费版"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <a href="/pricing" style={{ padding: "8px 20px", background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              升级套餐
            </a>
            <button onClick={handleLogout} style={{ padding: "8px 20px", background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              退出登录
            </button>
          </div>
        </div>

        {/* 额度详情 */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 28, marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 18, margin: "0 0 18px" }}>📊 额度详情</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { label: "🎁 赠送额度", value: quota?.gift_credits ?? "-", desc: "首次注册赠送" },
              { label: "📦 订阅剩余", value: quota?.subscription_remaining ?? "-", desc: "本月剩余次数" },
              { label: "💎 积分余额", value: quota?.credits_balance ?? "-", desc: "一次性购买积分" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#f8fafc", borderRadius: 14, padding: "16px 18px", border: "1px solid #e8ecf4" }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#7c3aed", lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: "12px 16px", background: "linear-gradient(135deg, #faf5ff, #ede9fe)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#5b21b6", fontWeight: 600 }}>合计可用次数：{quota?.total_remaining ?? "-"} 次</span>
            <a href="/pricing" style={{ fontSize: 12, color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>购买更多 →</a>
          </div>
        </div>

        {/* 使用记录 */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "0 0 18px" }}>🕐 使用记录</h2>
          {loading ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "24px 0" }}>加载中...</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "32px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14 }}>暂无使用记录</div>
              <a href="/" style={{ display: "inline-block", marginTop: 12, fontSize: 13, color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>去处理第一张图片 →</a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {logs.map((log) => (
                <div key={log.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #ede9fe, #ddd6fe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🖼</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>背景移除</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{deductLabel[log.deduct_from] || log.deduct_from}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {new Date(log.used_at * 1000).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
