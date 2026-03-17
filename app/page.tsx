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

  // 处理文件选择
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

  // 处理拖拽上传
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

  // 处理背景移除
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

  // 下载图片
  const handleDownload = () => {
    if (!result.processedImage) return;

    const link = document.createElement("a");
    link.href = result.processedImage;
    link.download = `removed-background-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 重置
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI 背景移除工具
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                3秒快速移除图片背景 · 免费 · 无需注册
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                ✨ 50张/月免费
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!result.processedImage ? (
          /* 上传区域 */
          <div className="max-w-3xl mx-auto">
            <div
              className={`bg-white rounded-2xl shadow-xl p-8 transition-all duration-300 ${
                isDragging ? "ring-4 ring-blue-500 bg-blue-50" : ""
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
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

              {!previewUrl ? (
                <div className="text-center py-12">
                  {/* 图标 */}
                  <div className="mb-6 flex justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg
                        className="w-12 h-12 text-white"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    拖拽图片到这里
                  </h2>
                  <p className="text-gray-600 mb-6">
                    或点击下方按钮选择文件
                  </p>

                  {/* 支持格式 */}
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mb-8">
                    <span className="px-4 py-2 bg-gray-100 rounded-lg">
                      JPG
                    </span>
                    <span className="px-4 py-2 bg-gray-100 rounded-lg">
                      PNG
                    </span>
                    <span className="px-4 py-2 bg-gray-100 rounded-lg">
                      WebP
                    </span>
                    <span className="px-4 py-2 bg-gray-100 rounded-lg">
                      最大 5MB
                    </span>
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    选择图片
                  </button>
                </div>
              ) : (
                <div>
                  {/* 预览图片 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                      预览
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 flex justify-center">
                      <img
                        src={previewUrl}
                        alt="预览"
                        className="max-h-80 rounded-lg shadow-md"
                      />
                    </div>
                  </div>

                  {/* 处理进度 */}
                  {processing.isProcessing && (
                    <div className="mb-6 bg-blue-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-blue-900">
                          正在处理...
                        </span>
                        <span className="text-sm font-bold text-blue-600">
                          {processing.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${processing.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* 错误提示 */}
                  {processing.error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                      <p className="text-red-700 font-medium">
                        ⚠️ {processing.error}
                      </p>
                      <button
                        onClick={() =>
                          setProcessing({ ...processing, error: null })
                        }
                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                      >
                        关闭
                      </button>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={handleRemoveBackground}
                      disabled={processing.isProcessing}
                      className="flex-1 max-w-xs px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {processing.isProcessing ? "处理中..." : "移除背景"}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={processing.isProcessing}
                      className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                    >
                      重新选择
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 功能说明卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-semibold text-gray-900 mb-2">快速处理</h3>
                <p className="text-sm text-gray-600">3-5秒完成背景移除</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-3xl mb-3">🔒</div>
                <h3 className="font-semibold text-gray-900 mb-2">隐私保护</h3>
                <p className="text-sm text-gray-600">图片仅在内存中处理</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-3xl mb-3">💎</div>
                <h3 className="font-semibold text-gray-900 mb-2">高质量</h3>
                <p className="text-sm text-gray-600">AI 智能识别边缘</p>
              </div>
            </div>
          </div>
        ) : (
          /* 结果展示 */
          <div className="max-w-6xl mx-auto space-y-6">
            {/* 成功提示 */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-green-900">
                    处理完成！
                  </h2>
                  <p className="text-sm text-green-700 mt-1">
                    您的图片背景已成功移除
                  </p>
                </div>
              </div>
            </div>

            {/* 图片对比区域 */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 原图 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      原图
                    </h3>
                    <span className="text-xs text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                      Before
                    </span>
                  </div>
                  <div className="checkerboard-bg rounded-xl p-4 border-2 border-gray-200">
                    <img
                      src={result.originalImage!}
                      alt="原图"
                      className="w-full rounded-lg"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  </div>
                </div>

                {/* 处理后 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      处理后
                    </h3>
                    <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      ✓ 完成
                    </span>
                  </div>
                  <div className="checkerboard-bg rounded-xl p-4 border-2 border-green-200">
                    <img
                      src={result.processedImage!}
                      alt="处理后"
                      className="w-full rounded-lg"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  </div>
                </div>
              </div>

              {/* 缩放控制 */}
              <div className="mt-6 flex items-center justify-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  缩放:
                </span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {[50, 100, 150].map((level) => (
                    <button
                      key={level}
                      onClick={() => setZoomLevel(level)}
                      className={`px-6 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                        zoomLevel === level
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {level}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="mt-8 flex flex-wrap gap-4 justify-center">
                <button
                  onClick={handleDownload}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  下载图片
                </button>
                <button
                  onClick={handleReset}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  处理新图片
                </button>
              </div>
            </div>

            {/* 使用提示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">💡</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    使用提示
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>图片已自动处理为透明背景的 PNG 格式</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>点击"下载图片"保存到本地</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>本月免费额度: 50 张</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-gray-100 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-center md:text-left text-sm text-gray-600">
              © 2026 AI Background Remover · 基于 Remove.bg API
            </p>
            <p className="text-center md:text-right text-sm text-gray-600 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              隐私保护：图片仅在内存中处理
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
