# 项目架构与 DSL 渲染说明

## 1. 文档目标

这份文档用于说明当前项目的两件事：

1. 整体架构是如何分层的。
2. `model/**` 里的 DSL 配置是如何一步步渲染成页面的。

当前项目不是“任意 DSL 生成任意页面”的通用低代码平台，而是一个“固定后台框架 + 配置驱动内容区”的半低代码系统。

---

## 2. 整体架构概览

项目同时包含：

- 服务端：负责页面模板渲染、项目配置接口、业务接口、中间件。
- 前端：负责后台页面框架、菜单切换、Schema 页解释与渲染。
- DSL 配置层：负责描述项目菜单、模块类型、Schema 页面字段与行为。

可以把它理解为下面 4 层：

```text
┌──────────────────────────────────────────────┐
│ 1. DSL 配置层                                │
│ model/**/model.js                            │
│ model/**/project/*.js                        │
└──────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│ 2. 服务端配置装配层                          │
│ model/index.js                               │
│ service/project.js                           │
│ controller/project.js                        │
└──────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│ 3. 前端解释层                                │
│ pages/dashboard/dashboard.vue                │
│ pages/dashboard/.../schema-view/hooks/schema.js │
└──────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│ 4. 渲染组件层                                │
│ schema-search-bar / schema-table / schema-form │
│ 以及 create-form 等扩展组件                  │
└──────────────────────────────────────────────┘
```

---

## 3. 目录职责

### 3.1 服务端相关

- `controller/`
  - HTTP 控制器。
  - `controller/view.js` 负责页面模板渲染。
  - `controller/project.js` 负责项目配置接口。
  - `controller/business.js` 负责示例业务接口。

- `service/`
  - 服务层。
  - `service/project.js` 负责读取和返回项目配置。

- `middleware/`
  - 全局中间件。
  - 包含 API 签名校验、参数校验、项目上下文注入等逻辑。

- `router/`
  - 路由注册。
  - `router/view.js` 对应页面访问。
  - `router/project.js` 对应项目配置接口。
  - `router/business.js` 对应业务接口。

### 3.2 前端相关

- `pages/`
  - 前端页面入口和业务页面。
  - `pages/boot.js` 是通用启动器。
  - `pages/dashboard/` 是后台主壳。
  - `pages/widgets/` 是通用渲染组件。
  - `pages/store/` 是 Pinia 状态管理。

- `view/`
  - 页面模板文件。
  - `view/entry.tpl` 是前端入口模板。

- `webpack/`
  - 多页面打包配置。

### 3.3 DSL 配置相关

- `model/**/model.js`
  - 模型级默认配置。
  - 描述某类系统的公共菜单和公共结构。

- `model/**/project/*.js`
  - 项目级配置。
  - 在模型默认配置基础上做覆写或补充。

- `docs/dashboard-model.js`
  - DSL 结构说明草稿。
  - 当前实现和这份草稿存在少量命名漂移，见本文最后的“已知问题”。

---

## 4. 页面启动链路

### 4.1 打包阶段

Webpack 会扫描 `pages/**/entry.*.js`，自动把每个入口打成一个独立页面模板。

例如：

- `pages/dashboard/entry.dashboard.js`
- `pages/project-list/entry.project-list.js`

最终会生成：

- `public/dist/entry.dashboard.tpl`
- `public/dist/entry.project-list.tpl`

这意味着当前项目是“多页面入口”，不是单一 SPA。

### 4.2 服务端渲染模板

当访问：

```text
/view/dashboard
```

服务端会走：

1. `router/view.js`
2. `controller/view.js`
3. `ctx.render('dist/entry.dashboard', data)`

`view/entry.tpl` 负责输出 HTML 壳，并把下面这些运行时信息写到页面里：

- `window.env`
- `window.projKey`
- `window.options`

这些值后续会被前端请求层和业务逻辑使用。

### 4.3 前端启动

每个 `entry.xxx.js` 最终都会调用 `pages/boot.js`。

`boot.js` 负责：

- 创建 Vue App
- 注册 Element Plus
- 注册 Pinia
- 注册 Router
- 挂载到 `#root`

所以服务端只负责“把页面壳交给浏览器”，真正的页面交互还是前端 Vue 完成。

---

## 5. 项目配置是怎么来的

### 5.1 配置来源

项目配置分两层：

1. 模型配置：`model/<业务域>/model.js`
2. 项目配置：`model/<业务域>/project/<项目>.js`

例如：

- `model/buiness/model.js`
- `model/buiness/project/pdd.js`

### 5.2 配置装配

`model/index.js` 会扫描整个 `model/` 目录，然后做两件事：

1. 收集每个模型的默认配置。
2. 收集每个项目的个性化配置。

然后通过 `projectExtendModel()` 把项目配置合并到模型配置上。

这个合并不是简单覆盖，而是支持按 `key` 递归合并数组节点，尤其适合菜单树这种结构。

### 5.3 前端获取配置

后台页面加载后，`pages/dashboard/dashboard.vue` 会请求：

- `/api/project/list`
- `/api/project`

其中：

- `/api/project/list` 用于顶部项目切换。
- `/api/project` 用于获取当前项目完整菜单 DSL。

拿到配置后：

- `projectStore` 保存项目列表。
- `menuStore` 保存当前项目的菜单树。

---

## 6. 当前 DSL 的职责边界

当前 DSL 主要控制的是“后台模块内容”，不是整个 Vue 页面框架。

也就是说，DSL 能决定：

- 顶部菜单和侧边菜单长什么样
- 当前菜单是 iframe、schema、custom、还是 sider
- schema 页面里有哪些搜索项
- schema 页面里有哪些表格列
- schema 页面里有哪些按钮
- 是否挂载某个扩展组件

但 DSL 不能直接决定：

- 整个页面骨架
- 组件布局系统
- Vue 路由体系
- 全局状态结构

所以它更像“领域后台 DSL”，不是完整页面引擎。

---

## 7. DSL 结构说明

一个菜单节点的核心字段如下：

```js
{
  key: "category3",
  name: "schema",
  menuType: "module",
  moduleType: "schema",
  schemaConfig: {
    api: "/api/proj/product",
    schema: {
      type: "object",
      properties: {
        product_id: {
          type: "string",
          label: "商品ID",
          tableOption: {}
        }
      }
    },
    tableConfig: {},
    searchConfig: {},
    componentConfig: {}
  }
}
```

### 7.1 `moduleType`

当前支持的模块类型：

- `iframe`
- `schema`
- `custom`
- `sider`

含义：

- `iframe`：渲染 iframe 页面。
- `schema`：渲染配置驱动的搜索区 + 表格区 + 扩展区。
- `custom`：跳转到固定自定义路由组件。
- `sider`：进入一个带侧边菜单的二级模块。

### 7.2 `schemaConfig.schema`

这是 Schema 页的核心 DSL。

每个字段通常同时具备两类信息：

1. 领域数据描述
   - `type`
   - `label`
   - `required`
   - `minLength`
   - `pattern`

2. 不同渲染区域的 UI 描述
   - `tableOption`
   - `searchOption`
   - `createFormOption`

例子：

```js
product_name: {
  type: "string",
  label: "商品名称",
  tableOption: {
    width: 200
  },
  searchOption: {
    comType: "dynamicSelect",
    api: "/api/proj/product_enum/list"
  }
}
```

它表示同一个字段：

- 在表格中是一列
- 在搜索栏中是一个动态下拉框

### 7.3 `tableConfig`

表格行为配置，常见包括：

- `headerButtons`
- `rowButtons`

按钮配置里最关键的是：

- `eventKey`
- `eventOption`

这相当于一个轻量事件协议。

### 7.4 `componentConfig`

用于挂载扩展组件，比如抽屉表单、详情弹窗等。

当前项目里已经有 `createForm` 的预留能力，但实现还没有完全打通。

---

## 8. DSL 如何渲染成页面

这一节是核心。

### 8.1 总流程

```text
DSL 配置
  -> 后端返回 project 配置
  -> menuStore 保存菜单树
  -> 当前路由决定选中哪个 menuItem
  -> useSchema() 解释 menuItem.schemaConfig
  -> 构造 tableSchema / searchSchema / components
  -> schema-view 分发数据给搜索栏、表格、扩展组件
  -> 各渲染组件生成真实 Element Plus 组件
```

### 8.2 当前菜单节点定位

`pages/dashboard/complex-view/schema-view/hooks/schema.js` 通过下面两个 query 参数决定当前渲染哪个 DSL 节点：

- `key`
- `sider_key`

规则：

- 如果当前在侧边栏二级模块下，优先用 `sider_key`
- 否则用 `key`

这样 `schema-view` 就能定位到当前菜单树中的 `menuItem`。

### 8.3 `useSchema()` 做了什么

`useSchema()` 是整个 DSL 解释器的核心。

它做了 3 件事：

1. 读取当前 `menuItem.schemaConfig`
2. 把原始 `schema` 拆成不同视图需要的 DTO
3. 把 DTO 暴露给 `schema-view`

它输出的核心数据有：

- `api`
- `tableSchema`
- `tableConfig`
- `searchSchema`
- `searchConfig`
- `components`

### 8.4 为什么要拆成多个 Schema

原始 DSL 是按“字段”来描述的，但渲染时需要按“区域”消费：

- 搜索栏只关心 `searchOption`
- 表格只关心 `tableOption`
- 表单只关心 `createFormOption`

所以 `buildDtoSchema(schema, comName)` 会做一次“区域投影”：

- `comName = "table"` 时读取 `tableOption`
- `comName = "search"` 时读取 `searchOption`
- `comName = "createForm"` 时读取 `createFormOption`

输出统一格式：

```js
{
  type: "object",
  properties: {
    fieldA: {
      type: "...",
      label: "...",
      option: { ... }
    }
  }
}
```

这里的 `option` 是渲染组件真正关心的字段。

### 8.5 `schema-view` 如何组织页面

`schema-view.vue` 是 Schema 页容器，它只做编排，不处理细节。

页面结构固定为：

1. 搜索面板
2. 表格面板
3. 扩展组件列表

也就是说，Schema 页虽然是配置驱动的，但最终还是落在一个固定布局里。

它通过 `provide("schemaViewData", ...)` 把解释结果下发给子组件。

---

## 9. 搜索栏是怎么渲染出来的

### 9.1 渲染过程

`search-panel.vue` 本身很薄，只是包一层卡片，然后把 `searchSchema` 传给 `schema-search-bar.vue`。

真正的动态渲染发生在 `schema-search-bar.vue`：

1. 遍历 `searchSchema.properties`
2. 读取每个字段的 `schemaItem.option.comType`
3. 在 `schema-item.config.js` 里找到对应组件
4. 用动态组件 `<component :is="...">` 渲染

当前支持的搜索组件：

- `input`
- `select`
- `dynamicSelect`
- `dateRange`

### 9.2 统一子组件协议

每个搜索子组件都暴露相同的方法：

- `getValue()`
- `reset()`

有些还会在加载完成时触发 `loaded` 事件。

这使得 `schema-search-bar` 可以不关心具体组件类型，只统一聚合值。

例如：

- `input` 返回 `{ product_name: "xxx" }`
- `dateRange` 返回 `{ create_time_start: "...", create_time_end: "..." }`
- `dynamicSelect` 会先请求枚举接口，再返回选择值

所以搜索栏本质上是一个“动态字段组件容器 + 值聚合器”。

### 9.3 搜索值如何驱动表格刷新

`schema-view.vue` 监听搜索栏输出：

- 搜索时更新 `apiParams`
- 重置时清空 `apiParams`

而 `schema-table.vue` 会 watch：

- `schema`
- `api`
- `apiParams`

其中任何一个变化，都会重新拉取表格数据。

---

## 10. 表格是怎么渲染出来的

### 10.1 列渲染

`schema-table.vue` 直接遍历 `tableSchema.properties`，为每个字段生成一个 `el-table-column`。

列配置主要来自：

- `label`
- `option`

其中 `option` 来自 DSL 里的 `tableOption`。

例如：

```js
price: {
  label: "商品价格",
  option: {
    width: 200
  }
}
```

最终会变成一列宽度为 `200` 的 Element Plus 表格列。

### 10.2 数据请求

表格数据请求规则是固定约定，不是 DSL 自由定义：

- 列表请求地址：`${api}/list`
- 删除请求地址：`${api}`

例如 DSL 中写：

```js
api: "/api/proj/product"
```

那么：

- 列表接口就是 `/api/proj/product/list`
- 删除接口就是 `/api/proj/product`

### 10.3 表格按钮

表格按钮分两类：

- 表头按钮：`headerButtons`
- 行按钮：`rowButtons`

`table-panel.vue` 会读取按钮的 `eventKey`，并按约定分派逻辑。

当前已经落地的内置行为有：

- `remove`
- `showComponent`

例如：

```js
{
  label: "删除",
  eventKey: "remove",
  params: {
    product_id: "schema::product_id"
  }
}
```

表示：

1. 从当前行数据中取 `product_id`
2. 调用删除接口
3. 刷新表格

这里的 `"schema::product_id"` 可以理解为一个简化版的参数映射 DSL。

---

## 11. 扩展组件是怎么挂载的

### 11.1 设计意图

除了搜索栏和表格，这套系统还预留了“页面附加组件”能力。

流程是：

1. DSL 里配置 `componentConfig`
2. `useSchema()` 为每个组件名构造对应的 `schema + config`
3. `schema-view.vue` 根据 `ComponentConfig` 动态挂载组件

例如当前已有：

- `createForm`

对应映射在：

- `pages/dashboard/complex-view/schema-view/components/component-config.js`

### 11.2 当前状态

这条链路目前只完成了一半。

已经具备：

- 组件注册表
- 组件动态挂载
- `showComponent` 事件入口

但还没完全具备：

- 把 `item.schema` 和 `item.config` 传给扩展组件
- 把 `schema-form.vue` 真正接到 `create-form.vue` 里
- 表单提交和刷新联动

所以从架构上讲，这块已经有扩展方向；从实现上讲，目前还是预留态。

---

## 12. `proj_key` 如何贯穿业务接口

项目上下文不是到处手写传递，而是通过请求层和中间件协作完成。

### 12.1 前端注入

服务端在模板里把 `projKey` 写入 `window.projKey`。

### 12.2 请求封装

`pages/common/curl.js` 在调用 `/api/proj/` 开头的接口时，会自动在请求头里带上：

- `proj_key`

### 12.3 后端校验

`middleware/project-handler.js` 会拦截 `/api/proj/` 请求：

- 如果没有 `proj_key`，直接报错
- 如果有，就把它写到 `ctx.projKey`

### 12.4 业务使用

业务控制器可以直接读取 `ctx.projKey`，从而实现同一页面在不同项目下展示不同数据。

这也是当前 DSL 体系里“项目级上下文”最重要的一部分。

---

## 13. 一个完整的示例链路

以 `model/buiness/project/pdd.js` 中 `category3` 这个 Schema 菜单为例。

### 13.1 配置

DSL 里定义了：

- `api: "/api/proj/product"`
- 搜索字段：
  - `product_name` -> `dynamicSelect`
  - `price` -> `select`
  - `inventory` -> `input`
  - `create_time` -> `dateRange`
- 表格列：
  - `product_id`
  - `product_name`
  - `price`
  - `inventory`
  - `create_time`
- 表头按钮：
  - 新增商品 -> `showComponent`
- 行按钮：
  - 修改 -> `showComponent`
  - 删除 -> `remove`

### 13.2 运行时发生的事

1. 用户点击这个菜单。
2. 路由切到 `/view/dashboard/sider/schema?...`
3. `useSchema()` 找到该菜单节点的 `schemaConfig`
4. 生成：
   - `searchSchema`
   - `tableSchema`
   - `components.createForm`
5. 搜索栏渲染出动态表单控件。
6. 表格按 `${api}/list` 拉数据。
7. 行删除按钮按 `${api}` 发删除请求。
8. `showComponent` 尝试唤起 `createForm` 抽屉。

这就是“DSL -> 页面”的完整闭环。

---

## 14. 当前架构的优点

### 14.1 配置复用能力强

模型层和项目层分离，并支持递归合并，适合做：

- 平台公共菜单
- 项目定制菜单
- 局部字段覆写

### 14.2 Schema 拆分思路清晰

一份字段配置按区域投影成：

- 搜索 Schema
- 表格 Schema
- 表单 Schema

这是当前实现里最有价值的一点，因为它把“领域字段定义”和“UI 消费视角”分开了。

### 14.3 扩展方式统一

无论是搜索子项还是扩展组件，都走“组件注册表 + 动态组件 + 统一方法协议”的模式，扩展成本较低。

---

## 15. 当前实现的局限与问题

### 15.1 不是完全通用页面引擎

当前 DSL 只能驱动固定后台模板中的部分区域，不能直接表达：

- 任意布局
- 任意组件树
- 任意交互流

所以它更适合“后台运营页/列表页”这类标准场景。

### 15.2 文档和实现存在字段名漂移

`docs/dashboard-model.js` 中写的是：

- `tableOptions`
- `searchOptions`

但实际代码读取的是：

- `tableOption`
- `searchOption`

这会直接影响新同学理解和后续配置编写。

### 15.3 扩展组件链路未完全打通

`createForm` 目前只有抽屉壳子，没有真正使用：

- `schema-form.vue`
- `componentConfig`
- 提交接口

所以“表格 + 搜索”成熟度明显高于“配置化表单”。

### 15.4 路由监听不够完整

`useSchema()` 当前 watch 的是：

- `route.query.api`
- `route.query.sider_key`
- `menuStore.menuList`

但没有直接 watch `route.query.key`。

如果未来存在多个顶级 `schema` 菜单共享同一路由，只改 `key` 时，理论上存在不重新构建页面数据的风险。

### 15.5 事件系统仍然偏硬编码

现在按钮事件是：

- 配置里写 `eventKey`
- 代码里用 `EventHandlerMap` 手动映射

这说明行为层还不是完全配置驱动，而是“配置触发代码分支”。

---

## 16. 如何继续演进

如果后续要把这套系统做得更稳定，建议优先做下面几件事：

### 16.1 统一 DSL 命名

统一以下字段命名，避免文档和实现不一致：

- `tableOption`
- `searchOption`
- `createFormOption`
- `componentConfig`

### 16.2 补齐配置化表单链路

建议把 `createForm` 做完整：

1. 接收 `schema + config`
2. 内部使用 `schema-form.vue`
3. 支持新增/编辑
4. 保存成功后刷新表格

### 16.3 抽象事件协议

把现在的 `remove/showComponent` 扩展成更稳定的动作系统，例如：

- `openComponent`
- `request`
- `navigate`
- `confirmRequest`
- `refreshTable`

### 16.4 补齐 Schema 生命周期

可以继续补：

- 默认查询参数
- 字段联动
- 条件显示
- 表单校验和提交映射
- 列渲染 formatter

---

## 17. 一句话总结

当前项目的本质是：

**服务端负责页面入口和项目配置输出，前端负责把项目 DSL 解释成固定后台壳中的搜索区、表格区和扩展组件区。**

其中最核心的解释器是：

- `pages/dashboard/complex-view/schema-view/hooks/schema.js`

最核心的渲染器是：

- `pages/widgets/schema-search-bar/schema-search-bar.vue`
- `pages/widgets/schema-table/schema-table.vue`
- `pages/widgets/schema-form/schema-form.vue`

如果只看 DSL 到页面这一条主链路，可以概括成：

**菜单节点 -> schemaConfig -> useSchema 拆分 -> 动态组件映射 -> Element Plus 组件渲染。**
