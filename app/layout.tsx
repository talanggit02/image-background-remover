import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Background Remover - 免费在线图片背景移除工具",
  description: "3秒快速移除图片背景，支持JPG/PNG/WebP格式，免费使用，无需注册",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
