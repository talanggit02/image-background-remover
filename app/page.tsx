"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement, config: object) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

interface ResultState {
  originalImage: string | null;
  processedImage: string | null;
}

export default function Home() {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
  });
  const [result, setResult] = useState<ResultState>({
    originalImage: null,
    processedImage: null,
  });
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Toast helper ──
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // ── Fetch quota from backend ──
  const fetchQuota = useCallback(async (google_id: string) => {
    try {
      const res = await fetch(`/api/user/quota?google_id=${encodeURIComponent(google_id)}`);
      if (res.ok) {
        const data = await res.json();
        setQuota(data.quota);
      }
    } catch {
      // silently fail
    }
  }, []);

  // ── Sync user to backend after login ──
  const syncUser = useCallback(async (credential: string, google_id: string) => {
    try {
      await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      await fetchQuota(google_id);
    } catch {
      // silently fail
    }
  }, [fetchQuota]);

  // ── Google OAuth + localStorage restore ──
  useEffect(() => {
    const initGoogle = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          const payload = JSON.parse(atob(response.credential.split(".")[1]));
          const googleUser: GoogleUser = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            google_id: payload.sub,
          };
          setUser(googleUser);
          setShowLoginModal(false);
          // Persist to localStorage
          localStorage.setItem("bgr_user", JSON.stringify(googleUser));
          localStorage.setItem("bgr_credential", response.credential);
          syncUser(response.credential, payload.sub);
        },
      });
    };

    // Restore from localStorage on mount
    try {
      const savedUser = localStorage.getItem("bgr_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as GoogleUser;
        setUser(parsed);
        fetchQuota(parsed.google_id);
      }
    } catch {
      // ignore
    }

    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) { initGoogle(); clearInterval(interval); }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [syncUser, fetchQuota]);

  useEffect(() => {
    if (showLoginModal && googleBtnRef.current && window.google) {
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline", size: "large", text: "signin_with", width: 280, logo_alignment: "left",
      });
    }
  }, [showLoginModal]);

  // Close profile menu on outside click
  useEffect(() => {
    if (!showProfileMenu) return;
    const handler = () => setShowProfileMenu(false);
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [showProfileMenu]);

  const handleLogout = () => {
    window.google?.accounts.id.disableAutoSelect();
    setUser(null);
    setQuota(null);
    setShowProfileMenu(false);
    localStorage.removeItem("bgr_user");
    localStorage.removeItem("bgr_credential");
  };

  const handleFileSelect = useCallback((file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setProcessing({ isProcessing: false, progress: 0, error: "仅支持 JPG、PNG、WebP 格式的图片" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setProcessing({ isProcessing: false, progress: 0, error: "图片太大，请上传 25MB 以内的图片" });
      return;
    }
    setSelectedFile(file);
    setProcessing({ isProcessing: false, progress: 0, error: null });
    setResult({ originalImage: null, processedImage: null });
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // ── Upload zone click with login check ──
  const handleUploadClick = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    fileInputRef.current?.click();
  }, [user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect, user]);

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;

    // ── 未登录拦截 ──
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // ── 额度检查 ──
    if (quota && quota.total_remaining <= 0) {
      setShowPaywallModal(true);
      return;
    }

    setProcessing({ isProcessing: true, progress: 0, error: null });
    try {
      // 先扣减额度
      const useRes = await fetch("/api/use-quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_id: user.google_id }),
      });

      if (!useRes.ok) {
        const errData = await useRes.json();
        if (errData.error === "no_quota") {
          setProcessing({ isProcessing: false, progress: 0, error: null });
          setShowPaywallModal(true);
          return;
        }
        throw new Error(errData.message || "额度扣减失败");
      }

      const interval = setInterval(() => {
        setProcessing((prev) => {
          if (prev.progress >= 85) { clearInterval(interval); return prev; }
          return { ...prev, progress: prev.progress + 8 };
        });
      }, 400);

      const formData = new FormData();
      formData.append("image_file", selectedFile);
      const response = await fetch("/api/remove-background", { method: "POST", body: formData });
      clearInterval(interval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "处理失败，请稍后重试");
      }

      const blob = await response.blob();
      setResult({ originalImage: previewUrl, processedImage: URL.createObjectURL(blob) });
      setProcessing({ isProcessing: false, progress: 100, error: null });

      // 刷新额度
      await fetchQuota(user.google_id);
    } catch (error) {
      setProcessing({
        isProcessing: false,
        progress: 0,
        error: error instanceof Error ? error.message : "处理失败，请稍后重试",
      });
    }
  };

  const handleDownload = () => {
    if (!result.processedImage) return;
    const link = document.createElement("a");
    link.href = result.processedImage;
    link.download = `removed-bg-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setProcessing({ isProcessing: false, progress: 0, error: null });
    setResult({ originalImage: null, processedImage: null });
    setZoomLevel(100);
    setShowOriginal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f4ff 0%, #e8eeff 40%, #f5f0ff 70%, #eff6ff 100%)", color: "#1e293b", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Toast ── */}
      {toastMsg && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "#1e293b", color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", animation: "fadeIn 0.3s" }}>
          {toastMsg}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ borderBottom: "1px solid rgba(99,102,241,0.1)", backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.85)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 38, height: 38, background: "linear-gradient(135deg, #a855f7, #6366f1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 16px rgba(168,85,247,0.25)" }}>✂️</div>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, color: "#1e293b" }}>BGRemover</span>
            <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(168,85,247,0.1)", color: "#7c3aed", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(168,85,247,0.2)" }}>AI</span>
          </a>
          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
              <div style={{ width: 8, height: 8, background: "#22c55e", borderRadius: "50%", boxShadow: "0 0 8px #22c55e" }} />
              服务正常
            </div>
            {/* Upgrade Pro button (logged-in only) */}
            {user && (
              <button
                onClick={() => setShowPaywallModal(true)}
                style={{ padding: "6px 14px", background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "#fff", fontWeight: 700, fontSize: 12, border: "none", borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(245,158,11,0.3)" }}
              >
                ⚡ 升级 Pro
              </button>
            )}
            {/* Login area */}
            {user ? (
              <div style={{ position: "relative" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: "6px 14px 6px 6px", cursor: "pointer" }}
                >
                  <img src={user.picture} alt={user.name} style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(168,85,247,0.3)" }} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{user.name}</div>
                    {quota && (
                      <div style={{ fontSize: 11, color: quota.total_remaining > 0 ? "#7c3aed" : "#ef4444", fontWeight: 600 }}>
                        ⚡ 剩余 {quota.total_remaining} 次
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>▼</span>
                </button>

                {/* ── Profile dropdown ── */}
                {showProfileMenu && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 200, background: "#fff", borderRadius: 12, border: "1px solid rgba(99,102,241,0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.12)", padding: "8px", zIndex: 60 }}>
                    <a
                      href="/profile"
                      style={{ display: "block", padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: "#1e293b", textDecoration: "none", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      👤 个人中心
                    </a>
                    <button
                      onClick={handleLogout}
                      style={{ display: "block", width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: "#64748b", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      🚪 退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", background: "linear-gradient(135deg, #7c3aed, #6366f1)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.25)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".8"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".9"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" opacity=".7"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".85"/></svg>
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        {!result.processedImage ? (
          <>
            {/* ── Hero ── */}
            <section style={{ textAlign: "center", padding: "72px 0 56px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: 999, padding: "6px 16px", fontSize: 13, color: "#6366f1", marginBottom: 32 }}>
                <span style={{ color: "#a78bfa" }}>✦</span>
                AI 驱动 · 5秒完成 · 注册送3次免费
              </div>

              <h1 style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05, margin: "0 0 20px", letterSpacing: -2, color: "#1e293b" }}>
                一键移除<br />
                <span style={{ background: "linear-gradient(90deg, #7c3aed, #ec4899, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  图片背景
                </span>
              </h1>
              <p style={{ fontSize: 18, color: "#64748b", maxWidth: 480, margin: "0 auto 48px", lineHeight: 1.7 }}>
                上传图片，AI 自动识别主体，秒级生成透明背景图。电商抠图、证件照、设计素材，一键搞定。
              </p>

              {/* Steps */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 56 }}>
                {[
                  { num: "01", title: "上传图片", desc: "拖拽或点击选择" },
                  { num: "02", title: "AI 处理", desc: "智能识别移除背景" },
                  { num: "03", title: "下载结果", desc: "获取透明 PNG" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ textAlign: "center", padding: "0 24px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 4, letterSpacing: 1 }}>{s.num}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{s.desc}</div>
                    </div>
                    {i < 2 && <div style={{ width: 48, height: 1, background: "linear-gradient(90deg, rgba(124,58,237,0.3), transparent)", flexShrink: 0 }} />}
                  </div>
                ))}
              </div>

              {/* ── Upload Zone ── */}
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                {!previewUrl ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={handleUploadClick}
                    style={{
                      border: isDragging ? "2px dashed #7c3aed" : "2px dashed rgba(99,102,241,0.2)",
                      borderRadius: 24,
                      padding: "64px 40px",
                      cursor: "pointer",
                      background: isDragging ? "rgba(124,58,237,0.04)" : "rgba(255,255,255,0.6)",
                      transition: "all 0.25s",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 56, marginBottom: 16 }}>{isDragging ? "📂" : "🖼️"}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
                      {isDragging ? "松开即可上传" : "拖拽图片到这里"}
                    </div>
                    <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 28 }}>或者点击下方按钮选择文件</div>
                    <button
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px", background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff", fontWeight: 700, fontSize: 16, border: "none", borderRadius: 14, cursor: "pointer", boxShadow: "0 8px 32px rgba(124,58,237,0.25)" }}
                    >
                      <span style={{ fontSize: 18 }}>+</span> 选择图片
                    </button>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 24, fontSize: 13, color: "#94a3b8" }}>
                      <span>✓ JPG</span><span>✓ PNG</span><span>✓ WebP</span>
                      <span style={{ color: "#cbd5e1" }}>·</span>
                      <span>最大 25MB</span>
                    </div>
                  </div>
                ) : (
                  /* Preview card */
                  <div style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(99,102,241,0.1)", borderRadius: 24, overflow: "hidden" }}>
                    <div style={{ padding: 24 }}>
                      <div style={{ background: "#f8fafc", borderRadius: 16, overflow: "hidden", position: "relative" }}>
                        <img src={previewUrl} alt="预览" style={{ width: "100%", maxHeight: 300, objectFit: "contain", display: "block" }} />
                        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 12, padding: "4px 10px", borderRadius: 999 }}>
                          {selectedFile?.name}
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    {processing.isProcessing && (
                      <div style={{ padding: "0 24px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                          <span style={{ color: "#64748b" }}>AI 正在处理中...</span>
                          <span style={{ color: "#7c3aed", fontWeight: 700 }}>{processing.progress}%</span>
                        </div>
                        <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${processing.progress}%`, background: "linear-gradient(90deg, #7c3aed, #6366f1)", borderRadius: 99, transition: "width 0.3s" }} />
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {processing.error && (
                      <div style={{ margin: "0 24px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, padding: "12px 16px" }}>
                        <p style={{ color: "#dc2626", fontSize: 14, margin: 0 }}>⚠️ {processing.error}</p>
                        <button onClick={() => setProcessing({ ...processing, error: null })} style={{ color: "#ef4444", fontSize: 12, background: "none", border: "none", cursor: "pointer", marginTop: 4, padding: 0 }}>关闭</button>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ padding: "0 24px 24px", display: "flex", gap: 12 }}>
                      <button
                        onClick={handleRemoveBackground}
                        disabled={processing.isProcessing}
                        style={{ flex: 1, padding: "15px 0", background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff", fontWeight: 700, fontSize: 16, border: "none", borderRadius: 14, cursor: processing.isProcessing ? "not-allowed" : "pointer", opacity: processing.isProcessing ? 0.6 : 1, boxShadow: "0 4px 20px rgba(124,58,237,0.25)" }}
                      >
                        {processing.isProcessing ? "⏳ 处理中..." : "✂️ 立即移除背景"}
                      </button>
                      <button
                        onClick={handleReset}
                        disabled={processing.isProcessing}
                        style={{ padding: "15px 24px", background: "#f8fafc", color: "#64748b", fontWeight: 600, fontSize: 15, border: "1px solid #e2e8f0", borderRadius: 14, cursor: "pointer" }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ── Features ── */}
            <section style={{ paddingBottom: 80 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
                {[
                  { icon: "⚡", title: "极速处理", desc: "AI 5秒内完成抠图，告别漫长等待" },
                  { icon: "🎯", title: "精准识别", desc: "毫发必现，边缘细节完美保留" },
                  { icon: "🔒", title: "隐私安全", desc: "图片仅在内存中处理，从不存储" },
                  { icon: "🆓", title: "注册即用", desc: "注册送 3 次免费额度，用完可充值" },
                ].map((f, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(99,102,241,0.08)", borderRadius: 20, padding: "28px 24px" }}>
                    <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          /* ── Result Section ── */
          <section style={{ padding: "48px 0 80px" }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #22c55e, #16a34a)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 16px rgba(34,197,94,0.25)" }}>✅</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>背景移除成功！</div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>点击下方按钮下载透明 PNG 文件</div>
                </div>
              </div>
              <button
                onClick={handleReset}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, color: "#64748b", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              >
                ← 处理新图片
              </button>
            </div>

            {/* Viewer */}
            <div style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(99,102,241,0.1)", borderRadius: 24, overflow: "hidden", marginBottom: 20 }}>
              {/* Toolbar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, gap: 4 }}>
                  {["处理后", "原图"].map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setShowOriginal(i === 1)}
                      style={{ padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: showOriginal === (i === 1) ? "#fff" : "transparent", color: showOriginal === (i === 1) ? "#1e293b" : "#94a3b8", boxShadow: showOriginal === (i === 1) ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>缩放</span>
                  <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
                    {[50, 100, 150].map((z) => (
                      <button
                        key={z}
                        onClick={() => setZoomLevel(z)}
                        style={{ padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: zoomLevel === z ? "#fff" : "transparent", color: zoomLevel === z ? "#1e293b" : "#94a3b8", boxShadow: zoomLevel === z ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}
                      >
                        {z}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Image area */}
              <div style={{
                padding: 32, minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center",
                backgroundImage: showOriginal ? "none"
                  : "linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)",
                backgroundSize: "24px 24px",
                backgroundPosition: "0 0,0 12px,12px -12px,-12px 0",
                backgroundColor: showOriginal ? "#f8fafc" : "#fff",
              }}>
                <div style={{ position: "relative" }}>
                  <img
                    src={showOriginal ? (result.originalImage ?? "") : (result.processedImage ?? "")}
                    alt="result"
                    style={{ maxHeight: 480, maxWidth: "100%", display: "block", transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center", transition: "transform 0.2s" }}
                  />
                  <div style={{ position: "absolute", top: 10, left: 10, background: showOriginal ? "rgba(100,116,139,0.85)" : "rgba(22,163,74,0.9)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 99 }}>
                    {showOriginal ? "原始图片" : "✓ 背景已移除"}
                  </div>
                </div>
              </div>
            </div>

            {/* Download / reset buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
              <button
                onClick={handleDownload}
                style={{ padding: "18px 0", background: "linear-gradient(135deg, #16a34a, #059669)", color: "#fff", fontWeight: 700, fontSize: 17, border: "none", borderRadius: 16, cursor: "pointer", boxShadow: "0 6px 24px rgba(22,163,74,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
              >
                ⬇️ 下载透明 PNG
              </button>
              <button
                onClick={handleReset}
                style={{ padding: "18px 0", background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff", fontWeight: 600, fontSize: 16, border: "none", borderRadius: 16, cursor: "pointer" }}
              >
                ✂️ 再处理一张
              </button>
            </div>

            {/* Tips */}
            <div style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 16, padding: "20px 24px", display: "flex", gap: 16 }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>💡</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6", marginBottom: 8 }}>使用小贴士</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13, color: "#64748b", lineHeight: 1.8 }}>
                  <li>· 图片已保存为 PNG 格式，背景完全透明，可直接用于设计</li>
                  <li>· 主体与背景对比越明显，抠图效果越精准</li>
                  <li>· 支持 JPG、PNG、WebP 格式，最大 25MB</li>
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid rgba(99,102,241,0.08)", marginTop: 8 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, color: "#94a3b8" }}>
          <span>© 2026 BGRemover · Powered by Remove.bg API</span>
          <div style={{ display: "flex", gap: 24 }}>
            <span>🔒 图片不上传存储</span>
            <span>🔐 HTTPS 加密传输</span>
            <span>🎁 注册送 3 次免费</span>
          </div>
        </div>
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
        style={{ display: "none" }}
      />

      {/* ── Login Modal ── */}
      {showLoginModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{ background: "#fff", border: "1px solid rgba(99,102,241,0.1)", borderRadius: 24, padding: "40px 36px", width: 360, textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✂️</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>登录 BGRemover</div>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 32, lineHeight: 1.6 }}>
              使用 Google 账号登录，注册即送 3 次免费额度
            </div>
            <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center", marginBottom: 20 }} />
            <button onClick={() => setShowLoginModal(false)} style={{ fontSize: 13, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", marginTop: 8 }}>暂不登录</button>
          </div>
        </div>
      )}

      {/* ── Paywall Modal (额度不足引导) ── */}
      {showPaywallModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowPaywallModal(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{ background: "#fff", border: "1px solid rgba(99,102,241,0.1)", borderRadius: 24, padding: "36px 32px", width: 520, boxShadow: "0 24px 80px rgba(0,0,0,0.15)" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>额度已用完</div>
              <div style={{ fontSize: 14, color: "#64748b" }}>选择适合您的方案继续使用</div>
            </div>

            {/* ── 积分包 ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 10 }}>💰 积分包（一次性购买，永久有效）</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { name: "入门包", price: "$1.9", count: "5次", unit: "$0.38/次" },
                  { name: "标准包", price: "$4.9", count: "15次", unit: "$0.33/次" },
                  { name: "大包", price: "$9.9", count: "35次", unit: "$0.28/次" },
                ].map((p, i) => (
                  <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginBottom: 2 }}>{p.price}</div>
                    <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, marginBottom: 2 }}>{p.count}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>{p.unit}</div>
                    <button
                      onClick={() => showToast("PayPal 支付即将上线，敬请期待 🚀")}
                      style={{ width: "100%", padding: "8px 0", background: "#7c3aed", color: "#fff", fontWeight: 600, fontSize: 12, border: "none", borderRadius: 8, cursor: "pointer" }}
                    >
                      立即购买
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 订阅套餐 ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 10 }}>📦 订阅套餐（每月重置额度）</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { name: "基础版", price: "$4.9", period: "/月", count: "20次/月", yearly: "年付 $47.0" },
                  { name: "专业版", price: "$12.9", period: "/月", count: "60次/月", yearly: "年付 $123.8" },
                  { name: "企业版", price: "$39.9", period: "/月", count: "200次/月", yearly: "年付 $383.0" },
                ].map((p, i) => (
                  <div key={i} style={{ background: i === 1 ? "linear-gradient(135deg, #7c3aed, #6366f1)" : "#f8fafc", border: i === 1 ? "none" : "1px solid #e2e8f0", borderRadius: 14, padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: i === 1 ? "rgba(255,255,255,0.8)" : "#64748b", marginBottom: 4 }}>{p.name}</div>
                    <div>
                      <span style={{ fontSize: 22, fontWeight: 900, color: i === 1 ? "#fff" : "#1e293b" }}>{p.price}</span>
                      <span style={{ fontSize: 12, color: i === 1 ? "rgba(255,255,255,0.7)" : "#94a3b8" }}>{p.period}</span>
                    </div>
                    <div style={{ fontSize: 12, color: i === 1 ? "rgba(255,255,255,0.9)" : "#7c3aed", fontWeight: 600, marginBottom: 2 }}>{p.count}</div>
                    <div style={{ fontSize: 11, color: i === 1 ? "rgba(255,255,255,0.6)" : "#94a3b8", marginBottom: 10 }}>{p.yearly}（8折）</div>
                    <button
                      onClick={() => showToast("PayPal 支付即将上线，敬请期待 🚀")}
                      style={{ width: "100%", padding: "8px 0", background: i === 1 ? "rgba(255,255,255,0.2)" : "#7c3aed", color: "#fff", fontWeight: 600, fontSize: 12, border: i === 1 ? "1px solid rgba(255,255,255,0.3)" : "none", borderRadius: 8, cursor: "pointer" }}
                    >
                      立即订阅
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
              <a href="/pricing" style={{ fontSize: 13, color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>查看完整套餐详情 →</a>
              <button onClick={() => setShowPaywallModal(false)} style={{ fontSize: 13, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>暂不购买</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
