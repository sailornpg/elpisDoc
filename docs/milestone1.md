# Elpis-Core 核心框架

## 1. 概述
`elpis-core` 是一个基于 **Koa** 构建的轻量级、约定优于配置（Convention over Configuration）的 Node.js 服务端框架。核心目标是简化中后台系统的开发流程，通过自动化的加载机制（Loaders）将复杂的业务逻辑解耦到 Controller、Service、Middleware 等不同层级中。

## 2. 核心设计理念
- **约定优于配置**：通过目录结构定义应用的行为。开发者只需建立特定的文件夹（如 `app/controller`），框架会自动扫描并挂载。
- **层级解耦**：强制区分请求处理层（Controller）、业务逻辑层（Service）和中间件层（Middleware），使代码结构清晰。
- **插件化扩展**：支持通过 `extend` 机制直接扩展 `app` 实例的功能。
- **环境隔离**：内置环境识别机制，支持 `local`, `beta`, `production` 不同环境的配置自动加载与合并。

## 3. 架构设计
`elpis-core` 的架构可以看作是 **Koa + 自动化加载器 (Loaders)**。

- **App 实例**：作为全局上下文，保存了所有的配置、控制器、服务、中间件。
- **分层模型**：
  1. **Routing**: 定义 API 路径与 Controller 方法的映射。
  2. **Middleware**: 全局或局部拦截器（如鉴权、参数校验）。
  3. **Controller**: 负责解析输入，调用 Service。
  4. **Service**: 负责数据库操作或第三方 API 调用。
  5. **Extend**: 支持通过 `extend` 机制直接扩展 `app` 实例的功能。
  6. **Router-Schema**: 定义 API 参数校验规则（配合 AJV 使用）。
  7. **Router**: 将定义的路由注册到 `koa-router` 中。
- **启动流程**：
  1. 初始化 Koa 实例及环境配置。
  2. 依序执行 Loaders（Config -> Middleware -> Router-Schema -> Controller -> Service -> Extend -> Router）。
  3. 启动监听服务。

## 4. Loader 详解

| Loader 名称 | 文件解析路径 | 挂载位置 | 作用 |
| :--- | :--- | :--- | :--- |
| **Config** | `/config/` | `app.config` | 合并默认配置与环境配置。 |
| **Middleware** | `/app/middleware/` | `app.middlewares` | 自动加载中间件函数，支持驼峰命名转换。 |
| **Controller** | `/app/controller/` | `app.controller` | 实例化控制器类，实现请求分发逻辑。 |
| **Service** | `/app/service/` | `app.service` | 实例化服务类，封装核心业务逻辑。 |
| **Extend** | `/app/extend/` | `app` | 允许在 `app` 实例上直接注入自定义属性或工具。 |
| **Router-Schema** | `/app/router-schema/` | `app.routerSchema` | 加载 API 参数校验规则（通常配合 AJV 使用）。 |
| **Router** | `/app/router/` | - | 将定义的路由注册到 `koa-router` 中。 |

### 加载模式示例
```javascript
// Controller Loader 示例逻辑
// 文件: app/controller/user.js -> 会被挂载到 app.controller.user
app.controller.user = new UserController();
```

## 5. 应用方法与场景

### 应用方法
1. **定义基类**：建议通过 `BaseController` 提供统一的 `success/fail` 返回格式。
2. **利用 Service**：在 Controller 中通过 `app.service.xxx` 调用对应服务。
3. **参数校验**：在 `router-schema` 中定义 JSON Schema，配合中间件实现 API 入参自动校验。

### 适用场景
- **中后台管理系统**：需要快速搭建标准化的 API 服务。
- **微服务节点**：轻量级，启动快，易于维护。
- **模版渲染应用**：支持集成 Nunjucks 等模板引擎（例如在 `app/middleware.js` 中配置）。

## 6. 最佳实践
- **Controller 只做转发**：不要在 Controller 中写复杂的 SQL 或逻辑，务必下沉到 Service 层。
- **继承 BaseController**：保持全站 API 返回结构的一致性。
- **充分利用 Extend**：工具类方法（如日期格式化、加解密）应放在 `app/extend` 中，而不是散落在各处。
- **配置环境化**：敏感信息（数据库密码等）放在各自环境的 `config.xxx.js` 中，不要在代码里硬编码。
- **使用 Router-Schema**：严谨的 API 必须定义 Schema 校验，防止因非法参数

---

