# CLAUDE.md — JClaw App 端开发行为准则

## 项目概述
本仓库包含两个代码库：
- **`src/`** — 主项目，基于 uni-app (Vue 3) 的移动端/H5/小程序 App（**需要开发和维护**）
- **`pc-demo/`** — PC 端参考实现（**只读，禁止修改**）

## 核心规则

### pc-demo 目录规则

- **绝对不要修改 `pc-demo/` 目录下的任何文件**
- `pc-demo/` 仅作为逻辑和实现的参考来源
- 需要参考 PC 端功能时，先阅读 `pc-demo/` 中的对应实现，然后在 `src/` 中用 uni-app 的方式重新实现
- 将 PC 端的 TypeScript 代码转写为 JavaScript
- 将 PC 端的 `fetch` / `localStorage` / `Tailwind` 对应替换为 `uni.request` / `uni.setStorageSync` / SCSS

## 目标平台
主要平台：**H5**、**微信小程序**、**App (Android/iOS)**

## 核心架构

### 业务桥接 (Business Bridge)
- H5: `window.postMessage` / iframe 通信
- App/小程序: `<web-view>` + `uni.postMessage`
- 消息类型: `JCLAW_OPEN_MODAL`、`JCLAW_NAVIGATE`、`JCLAW_ACTION`、`JCLAW_TOKEN`

## 开发规范

### 代码风格
- 使用 JavaScript，不要在 src/ 中引入 TypeScript
- 组合式 API（`<script setup>`）优先
- 组件使用 `<script setup>` + `<template>` + `<style lang="scss" scoped>`
- Pinia store 使用 `defineStore` + setup store 风格
- 工具函数和 composables 使用 ES Module 导出

### 命名规范
- 文件名：组件用 PascalCase（`ChatBubble.vue`），工具/composables 用 camelCase（`useChat.js`）
- 变量/函数：camelCase
- 常量：UPPER_SNAKE_CASE
- CSS 类名：kebab-case
- Pinia store ID：camelCase（如 `'chat'`）

### API 调用
- 所有 HTTP 请求通过 `src/utils/request.js` 封装的 `uni.request`
- 自动注入 token、clientid、operatePort
- 接口定义集中在 `src/api/` 目录

### 平台适配
- 优先编写跨平台代码，必要时使用条件编译

## 构建命令

```bash
# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# H5 生产构建
npm run build:h5

# 微信小程序生产构建
npm run build:mp-weixin
```

## 环境变量
- `VITE_API_BASE_URL` — 后端 API 地址（默认 `http://100.112.82.63:9199`）

## 参考文档

- 设计规格：`docs/superpowers/specs/2026-04-19-mobile-login-chat-design.md`
- PC 端参考：`pc-demo/`（只读）
