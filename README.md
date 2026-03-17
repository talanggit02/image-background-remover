# AI Background Remover

基于 AI 的在线图片背景移除工具，使用 Remove.bg API 实现快速背景移除。

## 功能特性

- ✅ **快速处理**: 3-5秒完成背景移除
- ✅ **免费使用**: 每月 50 张免费额度
- ✅ **隐私保护**: 图片仅在内存中处理，不上传服务器存储
- ✅ **简单易用**: 拖拽上传 → 自动处理 → 下载结果
- ✅ **多格式支持**: JPG、PNG、WebP
- ✅ **实时预览**: 支持缩放和原图对比

## 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript
- **样式**: Tailwind CSS
- **API**: Remove.bg API
- **部署**: Cloudflare Pages / Workers

## 本地开发

### 环境要求

- Node.js 18.17+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```bash
REMOVE_BG_API_KEY=your_remove_bg_api_key_here
```

获取 API Key: https://www.remove.bg/api

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

## 部署

### Cloudflare Pages 部署

1. 连接 GitHub 仓库
2. 配置构建设置：
   - **构建命令**: `npm run build`
   - **输出目录**: `.next`
3. 在环境变量中添加 `REMOVE_BG_API_KEY`
4. 部署完成！

## 使用说明

1. **上传图片**: 拖拽图片到上传区域，或点击选择文件
2. **自动处理**: AI 自动移除背景，3-5秒完成
3. **预览结果**: 查看处理效果，支持缩放和对比
4. **下载图片**: 点击下载按钮保存透明背景 PNG

## 项目结构

```
image-background-remover/
├── app/
│   ├── api/
│   │   └── remove-background/
│   │       └── route.ts       # API 路由
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 主页面
│   └── globals.css             # 全局样式
├── public/                     # 静态资源
├── .env.local                  # 环境变量（不提交）
├── next.config.mjs             # Next.js 配置
├── tailwind.config.ts          # Tailwind 配置
├── tsconfig.json               # TypeScript 配置
└── package.json                # 项目配置
```

## API 限制

- **免费版**: 50 张/月
- **付费版**: $0.20/张
- **图片大小**: 最大 10MB (本工具限制 5MB)
- **格式**: JPG, PNG, WebP

## 隐私保护

- ✅ 图片仅在内存中处理
- ✅ 不存储用户上传的图片
- ✅ 不保留处理后的图片
- ✅ HTTPS 加密传输

## 许可证

MIT License

## 联系方式

- 项目负责人: 张新
- GitHub: https://github.com/talanggit02/image-background-remover

---

**注意**: 使用本工具需要 Remove.bg API Key。请遵守 Remove.bg 的服务条款。
