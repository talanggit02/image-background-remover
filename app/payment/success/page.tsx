"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const plan = searchParams.get("plan");
  const orderId = searchParams.get("token");
  const subscriptionId = searchParams.get("subscription_id");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const processingRef = useRef(false);

  // suppress unused warning
  void plan;

  useEffect(() => {
    if (processingRef.current) return;
    processingRef.current = true;

    const googleId = localStorage.getItem("google_id");
    if (!googleId) {
      setStatus("error");
      setMessage("用户信息丢失，请重新登录");
      return;
    }

    if (type === "credits" && orderId) {
      fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      })
        .then((r) => r.json())
        .then((data: { success?: boolean; credits_added?: number; error?: string }) => {
          if (data.success) {
            setStatus("success");
            setMessage(`支付成功！已为您添加 ${data.credits_added} 次使用额度`);
          } else {
            setStatus("error");
            setMessage(data.error || "支付确认失败，请联系客服");
          }
        })
        .catch(() => {
          setStatus("error");
          setMessage("网络错误，请联系客服确认");
        });
    } else if (type === "subscription" && subscriptionId) {
      setStatus("success");
      setMessage("订阅成功！您的套餐额度将在几分钟内到账");
    } else {
      setStatus("error");
      setMessage("无效的支付回调参数");
    }
  }, [type, orderId, subscriptionId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: "48px 40px",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          maxWidth: 440,
          width: "90%",
        }}
      >
        {status === "loading" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
              正在确认支付...
            </h2>
            <p style={{ color: "#64748b", fontSize: 14 }}>请稍候，正在处理您的订单</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
              支付成功！
            </h2>
            <p style={{ color: "#64748b", fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
              {message}
            </p>
            <a
              href="/profile"
              style={{
                display: "inline-block",
                padding: "12px 32px",
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                color: "#fff",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              查看我的额度
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 56, marginBottom: 20 }}>❌</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
              处理失败
            </h2>
            <p style={{ color: "#64748b", fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
              {message}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <a
                href="/pricing"
                style={{
                  padding: "12px 24px",
                  border: "2px solid #7c3aed",
                  color: "#7c3aed",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                返回定价页
              </a>
              <a
                href="/profile"
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  color: "#fff",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                查看账户
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 48 }}>⏳</div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
