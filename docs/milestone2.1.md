# Elpis 项目 Vite 构建系统深度总结

本项目已从传统的 Webpack 架构平滑迁移至 **Vite 5.x**。为了在保留现有 Koa 后端模板渲染逻辑的同时，获得极致的开发体验和高质量的生产产物，我们设计了一套**分层配置 + 自定义插件**的构建体系。

---

## 一、 核心构建架构

采用分层配置以实现高度解耦和多环境复用：
- **`vite.config.js`**: 顶层控制中心。负责根据命令行指令（serve/build）调度不同环境配置，并引入 **`mergeConfig`** 进行深度合并，确保插件、服务器等配置项不会被简单覆盖。
- **`vite.base.js`**: 基础配置。处理路径别名 (`@pages` 等)、Vue 语法支持、Less 预处理及 **MPA（多页应用）** 入口的动态全扫描。
- **`vite.dev.js`**: 开发环境名。侧重于极速启动、配置 CORS 以及 HMR 稳定性。
- **`vite.prod.js`**: 生产环境名。侧重于 Terser 压缩、JS 分包策略及资源命名的 Hash 规则。
- **`tplPlugin.js`**: **核心自定义插件**。解决了 Vite 内存服务与后端物理模板渲染之间的桥接问题。

---

## 二、 热更新 (HMR) 逻辑实现

在本项目“Koa 后端渲染 + Vite 静态资源”的混合方案中，HMR 的实现逻辑如下：

### 1. No-Bundle 开发机制
在开发模式下，Vite 不进行物理打包。我们通过插件计算出业务源文件的相对路径，并以 `type="module"` 注入模板。浏览器直接请求源文件，Vite 实时编译并返回，省去了 Webpack 漫长的重新构建过程。

### 2. HMR WebSocket 桥接
- **Client 注入**: 插件自动在模板 `<head>` 插入 `http://127.0.0.1:9002/@vite/client`。
- **固定端口**: 指定 HMR 监听端口为 `9002`。即使用户通过 Koa 的 `8080` 端口访问页面，浏览器也能准确连接到 Vite Server 接收更新指令。

### 3. 模板写回磁盘 (Write to Disk)
由于 Koa 必须读取物理 `.tpl` 文件，而 Vite 开发资源在内存中，我们的 `tplPluginDev` 插件会在启动和 **监听模板变化 (`entry.tpl` 修改)** 时，强行将生成的 HTML 写入磁盘 `app/public/dist/*.tpl`。这实现了与 Webpack `devMiddleware.writeToDisk` 相同的效果。

---

## 三、 代码分包策略 (SplitChunks)

我们模拟了 Webpack 的 `splitChunks` 行为，将代码划分为三个层级：

1.  **`vendor` (第三方依赖)**: 
    - 匹配 `node_modules`。包含 Vue、Element Plus、Lodash 等。
    - **收益**: 变动频率极低，利用浏览器强缓存减少重复下载。
2.  **`common` (公共业务代码)**: 
    - 匹配 `@common`、`@widgets`、`@store`。
    - **收益**: 提取多页面共享的业务组件，避免每个页面重复打包。
3.  **`entry.{page}` (业务入口)**: 
    - 各个页面的私有逻辑，随页面按需加载。

---

## 四、 生产环境优化特性

### 1. 递归 CSS 依赖采集
针对 Vite 自动拆分 CSS 的特性，我们编写了递归追踪算法。在构建最终模板时，它会沿着 JS 依赖链向下寻找所有关联的 CSS 模块，即使样式隐藏在公共模块中也能准确提取并注入 `<link>` 标签，彻底避免了生产环境样式丢失的问题。

### 2. 高级压缩与清理
- 启用了 **Terser** 压缩。
- **自动剥离**: 生产环境下自动移除全量项目的 `console.log`、`console.info` 和 `debugger` 指令。
- **资源内联**: 小于 **4KB** 的资源（图片/字体）会被自动转化为 Base64 内联，减少 HTTP 请求数。

### 3. 资源命名规范
- **JS**: `js/[name]_[hash:8].bundle.js`
- **CSS**: `css/[name]_[hash:8].bundle.css`
- 符合传统 Webpack 项目的运维习惯。

---

## 五、 操作命令总结

- **启动开发监听**: `npm run build:dev:vite`
- **执行生产打包**: `npm run build:prod:vite`
