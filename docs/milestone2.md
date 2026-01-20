# Elpis 项目 Webpack 配置详解

本指南详细介绍了 Elpis 项目的 Webpack 5 构建系统设置，涵盖了从基础配置到生产环境优化的核心逻辑。

---

## 🏗️ 1. 核心架构

项目采用 **分层配置** 模式，通过 `webpack-merge` 组合配置：
- **`webpack.base.js`**: 基础配置，包含入口、解析路径、公用 Loader 和插件。
- **`webpack.prod.js`**: 生产环境配置，侧重于性能优化、代码分割和资源压缩。
- **`webpack.dev.js`**: 开发环境配置，侧重于开发体验、热更新和调试支持。

---

## 📦 2. 基础配置说明 (`webpack.base.js`)

### 2.1 动态多入口 (Multi-Entry)
项目通过 `glob` 自动扫描 `app/pages/**/entry.*.js`：
- **自动化**: 每增加一个页面只需按照命名规范创建入口文件，Webpack 会自动识别。
- **模板关联**: 利用 `HtmlWebpackPlugin` 为每个入口生成对应的 `.tpl` 模板文件。

### 2.2 核心 Loader 规则
- **Vue 支持**: 使用 `vue-loader` 处理 `.vue` 文件。
- **JS 转译**: `babel-loader` 处理 ES6+ 语法，范围锁定在 `./app/pages` 以提升速度。
- **样式处理**: 
  - 支持 `css` 和 `less`。
  - 生产环境下样式会被提取到独立文件，开发环境下通过 `style-loader` 内联。
- **资产模块 (Asset Modules)**:
  - 使用 Webpack 5 的 `asset` 类型（替代 `url-loader`）。
  - **内联策略**: 小于 8KB 的图片自动转为 Base64 以减少 HTTP 请求。

### 2.3 解析与快捷路径 (Resolve)
- **别名配置**: 
  - `@pages`: `app/pages`
  - `@common`: `app/pages/common`
  - `@widgets`: `app/pages/widgets`
  - `@store`: `app/pages/store`

---

## 🚀 3. 生产环境优化 (`webpack.prod.js`)

### 3.1 构建加速 (Speed)
- **多进程打包 (HappyPack)**: 利用多核 CPU 并行处理 JS 和 CSS 转译。
- **代码压缩**: `TerserWebpackPlugin` 开启并行压缩，并移除生产环境的 `console.log`。

### 3.2 资源优化 (Asset Optimization)
- **代码分割 (Code Splitting)**:
  - `vendor`: 独立打包第三方依赖（axios, lodash 等）。
  - `common`: 提取被多次引用的业务公共模块。
  - `runtimeChunk`: 提取 Webpack 运行时代码，确保长效缓存。
- **CSS 提取**: 使用 `MiniCssExtractPlugin` 提取样式，配合 `CSSMinimizerPlugin` 进行压缩。

### 3.3 目录清理
- 配置了 `CleanWebpackPlugin`，保证每次 `build` 产物目录都是干净的。

---

## 🌗 4. 开发环境 vs 生产环境深度对比

| 特性 | 开发环境 (Development) | 生产环境 (Production) |
| :--- | :--- | :--- |
| **核心目标** | 极致的开发体验与调试效率 | 极致的性能加载与线上稳定性 |
| **Mode** | `mode: "development"` (不压缩，原始名) | `mode: "production"` (Tree Shaking，代码混淆) |
| **Source Map** | `eval-cheap-module-source-map` (代码映射，方便定位) | 通常禁用或使用独立文件 (保护源码，减小体积) |
| **HMR 热更新** | **开启**。代码保存即生效，不刷新页面且保持状态 | **关闭**。代码全量打包，生成版本化静态资源 |
| **样式处理** | 内联注入 `<style>`，构建速度快 | **提取独立 CSS 文件**，并行下载并利用缓存 |
| **文件指纹** | 通常不带 Hash，或仅带简单的 `contenthash` | **强缓存策略**：`[chunkhash:8]` 确保版本管理稳定 |
| **调试信息** | 保留所有的 `console.log` 和注释 | **自动清理**：Terser 插件移除所有调试输出 |
| **网络请求** | 指向本地 DevServer (`http://localhost:9002`) | 指向 CDN 或生产静态资源路径 |

---

## 🛠️ 5. 开发环境配置 (`webpack.dev.js`) 深度解析

该文件是开发阶段的核心，其核心逻辑在于**建立浏览器与本地服务器的通信实时链路**。

### 5.1 核心代码逻辑拆解

#### 1. 动态注入 HMR 客户端
```javascript
Object.keys(baseConfig.entry).forEach((v) => {
  if (v !== "vendor") {
    const { HOST, PORT, HMR_PATH, TIMEOUT } = DEV_SERVER_CONFIG;
    baseConfig.entry[v] = [
      baseConfig.entry[v],
      // 关键：向每个业务入口注入 HMR 运行时的客户端代码
      `webpack-hot-middleware/client?path=http://${HOST}:${PORT}/${HMR_PATH}?timeout=${TIMEOUT}&reload=true`,
    ];
  }
});
```
*   **为什么要做这一步？** Webpack 默认打包出来的 JS 是静态的。为了实现热更新，我们需要在浏览器里运行一段“监听代码”，这段代码通过 EventSource 连接到开发服务器。注入后，浏览器就知道如何接收服务器发来的更新信号。

#### 2. 调试利器：Source Map
```javascript
devtool: "eval-cheap-module-source-map",
```
*   **原理**：`eval` 将每个模块包裹在 eval 字符串中，构建极快；`cheap` 忽略列信息只保留行信息；`module` 负责把 Loader（如 vue-loader）处理前的源代码映射出来。
*   **效果**：你在浏览器 F12 看到的是原汁原味的 `.vue` 文件，而不是编译后的 JS。

#### 3. HMR 核心插件
```javascript
plugins: [
  new HotModuleReplacementPlugin(), // 开启 HMR API
]
```
*   这个插件会在全局注入 `module.hot` 对象。只有有了这个对象，`vue-loader` 等程序才能调用 `module.hot.accept()` 接口来实现局部替换。

---

## 🔥 6. 热更新 (HMR) 核心原理深度阐述

HMR 的核心不是“刷新”，而是“**补丁式替换**”。

### 6.1 底层通信流程
1.  **Server 端 (监视者)**: Webpack 以 `watch` 模式启动。当你保存文件，Webpack 重新编译。
    *   它**不会**生成新的大文件，而是生成两个小补丁：一个 `[hash].hot-update.json`（描述哪些模块变了）和一个 `[chunk].[hash].hot-update.js`（具体的变化代码）。
2.  **Middleware (快递员)**: `webpack-hot-middleware` 通过一条长连接（EventSource/WebSocket）推送一个消息给浏览器：“新版本 Hash 是 XXX”。
3.  **Client 端 (接收者)**: 浏览器里的 HMR Runtime 收到 Hash。
    *   **比对**：发现和当前 Hash 不同。
    *   **下载清单**：先下 `.json` 文件确认有哪些模块更新了。
    *   **载入补丁**：动态创建 `<script>` 标签下载 `.js` 补丁，并立即执行。
4.  **Runtime (施工员)**: 
    *   **查找接口**：Webpack 运行环境会查找代码中是否定义了 `module.hot.accept`。
    *   **代码替换**：如果定义了（Vue 和 React 的 Loader 都会自动帮你加上），它会把内存中旧的模块定义删掉，换成补丁里的新定义，并重新执行该模块。
---

## 🍕 7. 代码分割

代码分割是 Webpack 优化中最关键的一环。它的核心目标是：**不要让用户一次性下载一个超大的 JS 文件，而是将其拆分成多个小文件，按需加载或利用并发下载。**

### 7.1 为什么要进行代码分割？
1.  **利用并发下载**：浏览器可以同时下载多个小文件，比下载一个大文件快。
2.  **缓存**：将**几乎不动**的第三方库（Vue, Lodash）和**经常变动**的业务代码分开。当你改了业务代码，用户只需要重新下载几 KB 的业务包，而几十 MB 的第三方库依然使用浏览器缓存。
3.  **按需加载**：只加载当前页面需要的代码，减少首屏负担。

### 7.2 项目中的 `SplitChunks` 配置拆解

在 `webpack.base.js` 的 `optimization` 中，配置了三个关键部分：

#### 1. `vendor` (第三方库)
*   **配置**: `test: /[\\/]node_modules[\\/]/`
*   **作用**: 专门把从 `node_modules` 引入的所有库打包进 `vendor.js`。
*   **策略**: 这些库（如 Element Plus, Axios）版本通常是固定的，适合设置强缓存（Max-Age 一年）。

#### 2. `common` (公用业务代码)
*   **配置**: `minChunks: 2`, `minSize: 1`
*   **作用**: 如果你写了一个 `utils.js` 工具函数，且被两个以上的页面入口 `import` 了，它就会被自动提取到 `common.js` 中。
*   **优点**: 防止重复打包。如果没有这一步，每个页面的 bundle 里都会包含一份一模一样的工具函数。

#### 3. `runtimeChunk: true` (运行时代码)
*   **作用**: 这会生成一个类似 `runtime~main.js` 的微型文件。
*   **深度原理解析**: Webpack 打包时会给每个模块分配 ID。模块 A 引用模块 B 时，内部记录的是 ID。
    *   **问题**: 如果不提取 runtime，模块 B 变了，模块 A 里的 ID 映射也会变，导致模块 A 的 Hash 也失效。
    *   **解决**: 提取 runtime 后，所有的模块映射关系都存在这个小文件里。哪怕业务代码变了，只要模块依赖关系没变，其他文件的 Hash 就能保持稳定。

### 7.3 代码分割示意图 (前后对比)

| 打包方式 | 产物结构 | 浏览器行为 |
| :--- | :--- | :--- |
| **不分割** | `main.js` (2MB) | 改一行代码，用户得重下 2MB。 |
| **分割后** | `vendor.js` (1.8MB) + `common.js` (100KB) + `page.js` (10KB) | 改一行代码，用户只重下 10KB。|

---

## ⚡ 8. 建议优化方向

<!-- 1.  **开启持久化缓存**: 在生产配置中添加 `cache: { type: 'filesystem' }`。 -->
<!-- 2.  **传输压缩**: 引入 `compression-webpack-plugin` 开启 Gzip 压缩。 -->
1.  **更换现代化 Loader**: 将 `HappyPack` 迁移至 `thread-loader`。
<!-- 4.  **资源路径统一**: 统一 `output.path`，利用 Webpack 5 内置的 `clean: true` 功能。 -->

---

> **相关脚本**: 
> - 生产编译: `npm run build:prod`
> - 开发编译: `npm run build:dev`
