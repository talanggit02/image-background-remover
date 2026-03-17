"use client";

import { useState, useRef } from "react";

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

interface ResultState {
  originalImage: string | null;
  processedImage: string | null;
  showComparison: boolean;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
  });
  const [result, setResult] = useState<ResultState>({
    originalImage: null,
    processedImage: null,
    showComparison: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setProcessing({
        isProcessing: false,
        progress: 0,
        error: "仅支持 JPG、PNG、WebP 格式的图片",
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setProcessing({
        isProcessing: false,
        progress: 0,
        error: "图片太大，请上传 5MB 以内的图片",
      });
      return;
    }

    setSelectedFile(file);
    setProcessing({ isProcessing: false, progress: 0, error: null });
    setResult({
      originalImage: null,
      processedImage: null,
      showComparison: false,
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;

    setProcessing({
      isProcessing: true,
      progress: 0,
      error: null,
    });

    try {
      const progressInterval = setInterval(() => {
        setProcessing((prev) => {
          if (prev.progress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, progress: prev.progress + 10 };
        });
      }, 500);

      const formData = new FormData();
      formData.append("image_file", selectedFile);

      const response = await fetch("/api/remove-background", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "处理失败，请稍后重试");
      }

      const blob = await response.blob();
      const processedImageUrl = URL.createObjectURL(blob);

      setResult({
        originalImage: previewUrl,
        processedImage: processedImageUrl,
        showComparison: false,
      });

      setProcessing({
        isProcessing: false,
        progress: 100,
        error: null,
      });
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
    link.download = `removed-background-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setProcessing({ isProcessing: false, progress: 0, error: null });
    setResult({
      originalImage: null,
      processedImage: null,
      showComparison: false,
    });
    setZoomLevel(100);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AI Background Remover
                </span>
              </h1>
              <p className="text-gray-400 text-sm">
                Powered by AI · Free & Fast · No Registration
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full shadow-lg shadow-purple-500/50">
                ✨ 50 FREE/MONTH
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!result.processedImage ? (
          /* 上传区域 */
          <div className="max-w-4xl mx-auto">
            <div
              className={`relative overflow-hidden rounded-3xl transition-all duration-500 ${
                isDragging
                  ? "ring-4 ring-purple-500 shadow-2xl shadow-purple-500/50 scale-[1.02]"
                  : ""
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {/* 背景装饰 */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-blue-600/20 backdrop-blur-3xl" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />

              <div className="relative p-12 md:p-16">
                {!previewUrl ? (
                  <div className="text-center">
                    {/* 主标题 */}
                    <div className="mb-8">
                      <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
                        Remove Image
                        <br />
                        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                          Background
                        </span>
                      </h2>
                      <p className="text-xl text-gray-300">
                        Upload an image to remove its background instantly
                      </p>
                    </div>

                    {/* 上传按钮 */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative px-12 py-6 bg-white text-slate-900 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Choose Image
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 blur-xl group-hover:blur-2xl transition-all duration-300" />
                    </button>

                    {/* 支持格式 */}
                    <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>JPG</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>PNG</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>WebP</span>
                      </div>
                      <span className="text-gray-500">·</span>
                      <span>Max 5MB</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* 预览区域 */}
                    <div className="mb-8">
                      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-96 mx-auto rounded-xl shadow-2xl"
                        />
                      </div>
                    </div>

                    {/* 处理进度 */}
                    {processing.isProcessing && (
                      <div className="mb-8 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-white font-bold text-lg">
                            Processing...
                          </span>
                          <span className="text-2xl font-black text-purple-400">
                            {processing.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-4 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out relative overflow-hidden"
                            style={{ width: `${processing.progress}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 错误提示 */}
                    {processing.error && (
                      <div className="mb-8 bg-red-500/20 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30">
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="flex-1">
                            <p className="text-red-300 font-semibold text-lg">
                              {processing.error}
                            </p>
                            <button
                              onClick={() =>
                                setProcessing({ ...processing, error: null })
                              }
                              className="mt-3 text-sm text-red-400 hover:text-red-300 underline"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={handleRemoveBackground}
                        disabled={processing.isProcessing}
                        className="group relative px-10 py-5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-purple-500/50 hover:shadow-3xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                          {processing.isProcessing ? (
                            <>
                              <svg
                                className="w-6 h-6 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                              </svg>
                              Remove Background
                            </>
                          )}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </button>
                      <button
                        onClick={handleReset}
                        disabled={processing.isProcessing}
                        className="px-10 py-5 bg-white/10 backdrop-blur-xl text-white rounded-2xl font-bold text-xl border-2 border-white/20 hover:bg-white/20 transition-all duration-300 disabled:opacity-50"
                      >
                        Choose Different Image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 特性卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                {
                  icon: "⚡",
                  title: "Lightning Fast",
                  desc: "Process images in 3-5 seconds with AI",
                },
                {
                  icon: "🔒",
                  title: "Privacy First",
                  desc: "Images processed in memory, never stored",
                },
                {
                  icon: "💎",
                  title: "High Quality",
                  desc: "Smart edge detection for perfect results",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="group bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                >
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 结果展示 */
          <div className="max-w-7xl mx-auto space-y-8">
            {/* 成功横幅 */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-3xl p-8 border border-green-500/30">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/50">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-black text-white mb-2">
                    Background Removed Successfully!
                  </h2>
                  <p className="text-gray-300 text-lg">
                    Your image is ready to download
                  </p>
                </div>
              </div>
            </div>

            {/* 图片对比 */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 原图 */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">Original</h3>
                    <span className="text-sm text-gray-400 px-4 py-2 bg-white/10 rounded-full">
                      Before
                    </span>
                  </div>
                  <div className="checkerboard-bg rounded-2xl p-6 border-2 border-white/20">
                    <img
                      src={result.originalImage!}
                      alt="Original"
                      className="w-full rounded-xl"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  </div>
                </div>

                {/* 处理后 */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">Processed</h3>
                    <span className="text-sm text-white px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full font-bold">
                      ✓ Done
                    </span>
                  </div>
                  <div className="checkerboard-bg rounded-2xl p-6 border-2 border-green-500/50">
                    <img
                      src={result.processedImage!}
                      alt="Processed"
                      className="w-full rounded-xl"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  </div>
                </div>
              </div>

              {/* 缩放控制 */}
              <div className="mt-8 flex items-center justify-center gap-4">
                <span className="text-white font-bold">Zoom:</span>
                <div className="flex bg-white/10 rounded-2xl p-2 gap-2">
                  {[50, 100, 150].map((level) => (
                    <button
                      key={level}
                      onClick={() => setZoomLevel(level)}
                      className={`px-6 py-3 rounded-xl transition-all duration-200 font-bold ${
                        zoomLevel === level
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                          : "text-gray-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {level}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleDownload}
                  className="group relative px-12 py-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-green-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download Image
                </button>
                <button
                  onClick={handleReset}
                  className="px-12 py-6 bg-white/10 backdrop-blur-xl text-white rounded-2xl font-bold text-xl border-2 border-white/20 hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Process New Image
                </button>
              </div>
            </div>

            {/* 提示 */}
            <div className="bg-blue-500/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
              <div className="flex items-start gap-4">
                <div className="text-4xl">💡</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-3">
                    Tips
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-300">
                    <p>• Image saved as PNG with transparent background</p>
                    <p>• Click Download to save to your device</p>
                    <p>• 50 free images per month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/50 backdrop-blur-xl border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © 2026 AI Background Remover · Powered by Remove.bg API
            </p>
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <svg
                className="w-4 h-4 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Privacy: Images processed in memory only
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
