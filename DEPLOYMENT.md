# Cloudflare Pages 部署指南

## ✅ 已完成

1. **代码已推送** - GitHub: https://github.com/talanggit02/image-background-remover
2. **Cloudflare Pages 项目** - [image-background-remover](https://dash.cloudflare.com/0e2ff896d194e80da8c5508865d568b5/pages/view/image-background-remover)
3. **预览URL** - https://image-background-remover-7t0.pages.dev

## ⚠️ 需要手动更新的配置

### Cloudflare Pages Dashboard 上的构建设置

**必须修改为以下配置：**

| 配置项 | 正确值 |
|--------|--------|
| Build command | `npx @cloudflare/next-on-pages` |
| Build output directory | `.vercel/output/static` |
| Root directory | （留空） |
| NODE_VERSION | `18`（或更高） |

**不要使用：**
- ~~Build command: `npm run build`~~ — 会导致递归调用
- ~~Build output directory: `.next`~~ — 这是 Next.js 原始输出，不是 Pages 需要的格式

### 兼容性标志（Compatibility Flags）

在 Settings > Functions > Compatibility Flags 中，确保 **production 和 preview** 都设置了：
- `nodejs_compat`

### 环境变量

| 变量名 | 值 |
|--------|-----|
| REMOVE_BG_API_KEY | nG2CcL1YQx7XN7VcUwCRegTw |
| NODE_VERSION | 18 |

### D1 数据库绑定

在 Settings > Functions > D1 database bindings 中：
- 变量名: `DB`
- 已绑定数据库: `bgremover-db` (ID: 9304a34f-00d9-4993-a03a-0c5951014566)

## 架构说明

项目使用 `@cloudflare/next-on-pages` 将 Next.js 打包为 Cloudflare Pages 兼容格式：

1. `npx @cloudflare/next-on-pages` 会先内部执行 `next build`
2. 然后将 Next.js 的输出转换为 `.vercel/output/static/`
3. 其中 `_worker.js` 包含所有 Edge Function Routes
4. API 通过 `app/api/` 目录下的 Next.js Route Handlers 实现
5. D1 绑定通过 `getRequestContext()` 从 `@cloudflare/next-on-pages` 获取

**重要:** 不要使用 `functions/` 目录的 Pages Functions，它们会被 `_worker.js` 覆盖。所有 API 逻辑已迁移到 `app/api/` 下。

## API 路由清单

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/auth/sync` | POST | 登录同步，首次注册送3次额度 |
| `/api/remove-background` | POST | 调用 Remove.bg API 移除背景 |
| `/api/use-quota` | POST | 扣减额度（gift→subscription→credits） |
| `/api/user/quota` | GET | 查询用户额度状态 |
| `/api/user/history` | GET | 查询使用记录（最近50条） |

## 更新部署步骤

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/0e2ff896d194e80da8c5508865d568b5/pages/view/image-background-remover)
2. 进入 Settings > Builds & deployments
3. 修改 Build command 为 `npx @cloudflare/next-on-pages`
4. 修改 Build output directory 为 `.vercel/output/static`
5. 确认环境变量 NODE_VERSION=18
6. 触发重新部署（Deployments > Retry deployment，或推送新 commit）
