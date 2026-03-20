import { NextRequest, NextResponse } from "next/server";

// Cloudflare Pages 需要 edge runtime
export const runtime = "edge";

const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    // 验证 API Key
    if (!REMOVE_BG_API_KEY) {
      return NextResponse.json(
        { error: "服务配置错误，请联系管理员" },
        { status: 500 }
      );
    }

    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get("image_file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "未找到图片文件" },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "不支持的图片格式，仅支持 JPG、PNG、WebP" },
        { status: 400 }
      );
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "图片太大，请上传 5MB 以内的图片" },
        { status: 400 }
      );
    }

    // 调用 Remove.bg API
    const removeBgFormData = new FormData();
    removeBgFormData.append("image_file", file);
    removeBgFormData.append("size", "auto");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": REMOVE_BG_API_KEY,
      },
      body: removeBgFormData,
    });

    if (!response.ok) {
      // 解析 remove.bg 返回的错误信息
      let errorMsg = "背景移除失败，请稍后重试";
      try {
        const errJson = await response.json() as { errors?: { title?: string; code?: string }[] };
        const code = errJson?.errors?.[0]?.code;
        if (response.status === 402) {
          errorMsg = "免费额度已用完，请明天再试或升级套餐";
        } else if (response.status === 401) {
          errorMsg = "API 认证失败，请联系管理员";
        } else if (code === "unknown_foreground") {
          errorMsg = "图片主体识别失败，建议换一张主体更清晰、背景对比明显的图片（如人像、商品白底图效果更好）";
        } else if (code === "file_too_large") {
          errorMsg = "图片文件过大，请压缩后重试";
        } else if (errJson?.errors?.[0]?.title) {
          errorMsg = `处理失败：${errJson.errors[0].title}`;
        }
      } catch (_) {
        // 解析失败就用默认文案
      }
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    // 获取处理后的图片
    const blob = await response.blob();

    // 返回图片
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="removed-background-${Date.now()}.png"`,
      },
    });
  } catch (error) {
    console.error("Remove background API error:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
