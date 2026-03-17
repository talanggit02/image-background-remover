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

  // 处理文件选择
  const handleFileSelect = (file: File) => {
    // 验证文件类型
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setProcessing({
        isProcessing: false,
        progress: 0,
        error: "仅支持 JPG、PNG、WebP 格式的图片",
      });
      return;
    }

    // 验证文件大小 (5MB)
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

    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 处理拖拽上传
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
      // 模拟进度
      const progressInterval = setInterval(() => {
        setProcessing((prev) => {
          if (prev.progress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, progress: prev.progress + 10 };
        });
      }, 500);

      // 调用 API
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            AI 背景移除工具
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            3秒快速移除图片背景 · 免费 · 无需注册
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!result.processedImage ? (
          /* 上传区域 */
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                processing.error
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300 hover:border-blue-400"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
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
                <div>
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="mt-4">
                    <p className="text-lg font-medium text-gray-900">
                      拖拽图片到这里，或点击选择文件
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      支持 JPG、PNG、WebP 格式，最大 5MB
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    选择图片
                  </button>
                </div>
              ) : (
                <div>
                  <img
                    src={previewUrl}
                    alt="预览"
                    className="max-h-96 mx-auto rounded-lg shadow-md"
                  />
                  <div className="mt-6 flex justify-center gap-4">
                    <button
                      onClick={handleRemoveBackground}
                      disabled={processing.isProcessing}
                      className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {processing.isProcessing ? "处理中..." : "移除背景"}
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      重新选择
                    </button>
                  </div>
                </div>
              )}

              {/* 处理进度 */}
              {processing.isProcessing && (
                <div className="mt-6">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processing.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    正在处理... {processing.progress}%
                  </p>
                </div>
              )}

              {/* 错误提示 */}
              {processing.error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium">⚠️ {processing.error}</p>
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
            </div>
          </div>
        ) : (
          /* 结果展示 */
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                ✅ 处理完成！
              </h2>

              {/* 图片预览 */}
              <div className="flex flex-col lg:flex-row gap-6 mb-6">
                {/* 原图 */}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    原图
                  </h3>
                  <div className="checkerboard-bg rounded-lg p-4 border border-gray-200">
                    <img
                      src={result.originalImage!}
                      alt="原图"
                      className="w-full rounded"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  </div>
                </div>

                {/* 处理后 */}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    处理后（透明背景）
                  </h3>
                  <div className="checkerboard-bg rounded-lg p-4 border border-gray-200">
                    <img
                      src={result.processedImage!}
                      alt="处理后"
                      className="w-full rounded"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  </div>
                </div>
              </div>

              {/* 缩放控制 */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm text-gray-700">缩放:</span>
                {[50, 100, 200].map((level) => (
                  <button
                    key={level}
                    onClick={() => setZoomLevel(level)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      zoomLevel === level
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {level}%
                  </button>
                ))}
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleDownload}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  📥 下载图片
                </button>
                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  🔄 处理新图片
                </button>
              </div>
            </div>

            {/* 功能说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-medium text-blue-900 mb-2">
                💡 使用提示
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 图片已自动处理为透明背景的 PNG 格式</li>
                <li>• 点击"下载图片"保存到本地</li>
                <li>• 本月免费额度: 50 张</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">
            © 2026 AI Background Remover · 基于 Remove.bg API ·
            隐私保护：图片仅在内存中处理
          </p>
        </div>
      </footer>
    </div>
  );
}
