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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Background Remover
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Remove image backgrounds instantly
              </p>
            </div>
            <div className="hidden sm:block">
              <span className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg">
                50 free/month
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {!result.processedImage ? (
          <div className="max-w-3xl mx-auto">
            {/* Upload Area */}
            <div
              className={`bg-white rounded-2xl border-2 transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
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
                <div className="p-16 text-center">
                  {/* Upload Icon */}
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <svg
                        className="w-8 h-8 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Upload an image
                  </h2>
                  <p className="text-gray-500 mb-8">
                    Drag and drop or click to browse
                  </p>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Choose Image
                  </button>

                  <p className="mt-6 text-sm text-gray-400">
                    JPG, PNG, or WebP • Max 5MB
                  </p>
                </div>
              ) : (
                <div className="p-8">
                  {/* Preview */}
                  <div className="mb-6">
                    <div className="bg-gray-50 rounded-xl p-6 flex justify-center">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-80 object-contain"
                      />
                    </div>
                  </div>

                  {/* Progress */}
                  {processing.isProcessing && (
                    <div className="mb-6 bg-blue-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-blue-900">
                          Processing...
                        </span>
                        <span className="text-sm font-semibold text-blue-600">
                          {processing.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${processing.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {processing.error && (
                    <div className="mb-6 bg-red-50 rounded-xl p-4">
                      <p className="text-red-700 text-sm font-medium">
                        {processing.error}
                      </p>
                      <button
                        onClick={() =>
                          setProcessing({ ...processing, error: null })
                        }
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleRemoveBackground}
                      disabled={processing.isProcessing}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing.isProcessing ? "Processing..." : "Remove Background"}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={processing.isProcessing}
                      className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {[
                {
                  title: "Fast",
                  desc: "3-5 seconds",
                },
                {
                  title: "Private",
                  desc: "Not stored on server",
                },
                {
                  title: "Free",
                  desc: "50 images/month",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-5 border border-gray-200"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Results */
          <div className="max-w-5xl mx-auto">
            {/* Success Banner */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
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
                  <h2 className="text-lg font-semibold text-green-900">
                    Background removed successfully
                  </h2>
                  <p className="text-sm text-green-700 mt-1">
                    Your image is ready to download
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Original */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Original</h3>
                    <span className="text-xs text-gray-500">Before</span>
                  </div>
                  <div className="checkerboard-bg rounded-lg p-4 border border-gray-200">
                    <img
                      src={result.originalImage!}
                      alt="Original"
                      className="w-full"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  </div>
                </div>

                {/* Processed */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Processed</h3>
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Done
                    </span>
                  </div>
                  <div className="checkerboard-bg rounded-lg p-4 border border-gray-200">
                    <img
                      src={result.processedImage!}
                      alt="Processed"
                      className="w-full"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  </div>
                </div>
              </div>

              {/* Zoom */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <span className="text-sm text-gray-600">Zoom:</span>
                <div className="inline-flex bg-gray-100 rounded-lg p-1">
                  {[50, 100, 150].map((level) => (
                    <button
                      key={level}
                      onClick={() => setZoomLevel(level)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        zoomLevel === level
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {level}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
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
                  Download
                </button>
                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  New Image
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Tips
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Image saved as PNG with transparent background</li>
                    <li>• Click Download to save to your device</li>
                    <li>• 50 free images per month</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>© 2026 Background Remover</p>
            <p>Images processed in memory only • Not stored</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
