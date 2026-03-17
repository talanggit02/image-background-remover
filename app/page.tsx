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
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

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
    setResult({ originalImage: null, processedImage: null });

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;

    setProcessing({ isProcessing: true, progress: 0, error: null });

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
      });

      setProcessing({ isProcessing: false, progress: 100, error: null });
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
    setResult({ originalImage: null, processedImage: null });
    setZoomLevel(100);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold text-gray-900">
            Background Remover
          </h1>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-16">
        {!result.processedImage ? (
          <div className="text-center">
            {/* Hero Section */}
            <div className="mb-12">
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Remove Image
                <br />
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Background Instantly
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                100% Automatic and Free • AI-Powered • No Quality Loss
              </p>
            </div>

            {/* Upload Section */}
            <div className="max-w-2xl mx-auto mb-16">
              {!previewUrl ? (
                <div>
                  {/* Main CTA Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative px-12 py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xl font-semibold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  >
                    <span className="flex items-center justify-center gap-3">
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Upload Image
                    </span>
                  </button>

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

                  {/* Supported Formats */}
                  <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
                    {["JPG", "PNG", "WebP"].map((format) => (
                      <div key={format} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>{format}</span>
                      </div>
                    ))}
                    <span className="text-gray-400">•</span>
                    <span>Max 5MB</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                  {/* Preview */}
                  <div className="mb-6">
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-80 mx-auto object-contain"
                      />
                    </div>
                  </div>

                  {/* Progress */}
                  {processing.isProcessing && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Processing...
                        </span>
                        <span className="text-sm font-bold text-purple-600">
                          {processing.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${processing.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {processing.error && (
                    <div className="mb-6 bg-red-50 rounded-2xl p-4">
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
                      className="flex-1 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {processing.isProcessing ? "Processing..." : "Remove Background"}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={processing.isProcessing}
                      className="px-8 py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: "⚡",
                  title: "Lightning Fast",
                  desc: "Process images in seconds with advanced AI",
                },
                {
                  icon: "🎯",
                  title: "High Quality",
                  desc: "Preserve fine details and edges perfectly",
                },
                {
                  icon: "🔒",
                  title: "100% Private",
                  desc: "Images deleted instantly after processing",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Results */
          <div>
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 mb-8 border border-green-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
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
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-green-900 mb-1">
                    Success!
                  </h2>
                  <p className="text-green-700">
                    Your image background has been removed
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Original */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Original</h3>
                    <span className="text-xs text-gray-500 font-medium px-3 py-1 bg-gray-100 rounded-full">
                      Before
                    </span>
                  </div>
                  <div className="checkerboard-bg rounded-xl p-4 border border-gray-200">
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
                    <h3 className="font-bold text-gray-900">Processed</h3>
                    <span className="text-xs text-white font-medium px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
                      ✓ Done
                    </span>
                  </div>
                  <div className="checkerboard-bg rounded-xl p-4 border border-gray-200">
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
                <span className="text-sm font-medium text-gray-700">Zoom:</span>
                <div className="inline-flex bg-gray-100 rounded-xl p-1">
                  {[50, 100, 150].map((level) => (
                    <button
                      key={level}
                      onClick={() => setZoomLevel(level)}
                      className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                        zoomLevel === level
                          ? "bg-white text-purple-600 shadow-sm"
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
                  className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
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
                  Download Image
                </button>
                <button
                  onClick={handleReset}
                  className="px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  Process Another
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="text-3xl">💡</div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-blue-900 mb-3">
                    Tips for Best Results
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Image is saved as PNG with transparent background</li>
                    <li>• Works best with clear subject and simple backgrounds</li>
                    <li>• 50 free images per month</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-20">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <p>© 2026 Background Remover. All rights reserved.</p>
            <p className="flex items-center gap-2">
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
              Secure & Private
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
