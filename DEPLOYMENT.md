# Cloudflare Pages 部署指南

## ✅ 已完成的配置

1. **Cloudflare Pages 项目已创建**
   - 项目名称: image-background-remover
   - 项目ID: 2fb1cf94-75c6-4940-a3d3-f39ea8c03870
   - 预览URL: https://image-background-remover-7t0.pages.dev

2. **环境变量已配置**
   - REMOVE_BG_API_KEY: nG2CcL1YQx7XN7VcUwCRegTw

3. **构建设置已配置**
   - 构建命令: npm run build
   - 输出目录: .next
   - 生产分支: main

## 📋 需要手动完成的步骤(仅需一次)

### 步骤 1: 访问 Cloudflare Dashboard

打开浏览器,访问:
```
https://dash.cloudflare.com/0e2ff896d194e80da8c5508865d568b5/pages/view/image-background-remover
```

### 步骤 2: 连接 GitHub

1. 点击页面上的 **"Connect to Git"** 或 **"Set up GitHub deployments"** 按钮
2. 点击 **"Connect GitHub Account"**
3. 在弹出窗口中授权 Cloudflare 访问你的 GitHub
4. 选择仓库: **talanggit02/image-background-remover**
5. 点击 **"Begin setup"**

### 步骤 3: 确认配置

确保以下设置正确:
```
✅ Project name: image-background-remover
✅ Production branch: main
✅ Build command: npm run build
✅ Build output directory: .next
✅ Root directory: (留空)
✅ Environment variables:
   - REMOVE_BG_API_KEY = nG2CcL1YQx7XN7VcUwCRegTw (已配置)
```

### 步骤 4: 保存并部署

点击 **"Save and Deploy"** 按钮

首次部署大约需要 3-5 分钟。

## 🎉 部署完成后

1. **生产环境URL**: https://image-background-remover-7t0.pages.dev
2. **自动部署**: 以后每次推送代码到 `main` 分支都会自动部署

## 🔄 自动部署流程

连接 GitHub 后,以下操作会自动触发部署:
- 推送代码到 `main` 分支 → 部署到生产环境
- 创建 Pull Request → 生成预览链接
- 合并 PR → 自动部署到生产环境

## 📝 当前项目状态

- ✅ GitHub 仓库: https://github.com/talanggit02/image-background-remover
- ✅ 代码已推送: 是
- ✅ 构建测试: 通过
- ✅ 环境变量: 已配置
- ⏳ GitHub 集成: 等待手动连接

## 🔧 故障排除

如果部署失败:

1. **检查构建日志**
   - 在 Cloudflare Dashboard 查看 Deployment Logs
   - 常见问题: 依赖安装失败、构建超时

2. **检查环境变量**
   - 确保 REMOVE_BG_API_KEY 已正确设置

3. **检查构建配置**
   - Build command: npm run build
   - Output directory: .next

## 📞 需要帮助?

如果遇到问题,请提供:
- 错误截图
- Deployment Logs 内容
- Cloudflare Dashboard 中的配置截图

---

**注意**: 由于 Cloudflare Pages 的 GitHub 集成需要用户手动授权(涉及 GitHub OAuth),所以这一步无法完全自动化完成。但只需要操作一次,之后所有部署都会自动进行。
