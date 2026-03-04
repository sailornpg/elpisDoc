# Elpis 领域模型与 DSL 架构深度解析

（特别是 `schema-view` 及其背后的 `hooks/schema.js` 与 `widgets` 体系）后，我们可以清晰地得出该项目前端架构的核心精髓：**基于元数据驱动（Metadata-Driven）的组件化与响应式映射设计。**

这份文档旨在梳理该架构的设计理念及其对 DSL（领域特定语言）的深妙运用。

---

## 1. 架构核心思想：元数据驱动与统一真理源

Elpis 没有采用传统的“针对每个业务实体编写模板与逻辑”的方式，而是建立了一套极具表达力的标准**元数据模型 (Schema)**。

*   **领域实体的沉淀 (Domain Entity)**：
    每一个业务字段在 Schema 中不仅定义了基本的数据结构（如通过 JSON Schema 标准的 `type`、`properties`），更重要的是附带了该属性在不同交互场景下的“UI 表现力”。
*   **统一真理源 (Single Source of Truth, SSOT)**：
    系统内任何一个业务字段（例如 `product_id`）从接口传输到表格展示，再到搜索条件，其基本类型与含义只有一处定义。由于业务上存在不同的关注点，系统通过不同的 Option 对象（`tableOption`、`searchOption`、`formOption`）将这一实体的不同视图态集结在同一个物理定义中，完美保证了一致性。

---

## 2. DSL (Domain-Specific Language) 的精妙设计

该项目中的 DSL 本质上是用 JSON 表示的 Schema，但其在结构维度的**切分与过滤**设计尤为出色。

### 2.1 DSL 的层级结构
整个 DSL 呈两层抽象设计：
1.  **全局描述层**：定义与场景无关的通用属性，例如 `label`（名称）、`type`（数据类型）。
2.  **特定场景配置层 (Option Layer)**：通过将业务映射至特定的环境对象（例如 `tableOption` 规定在表格中是否居中对齐、如何格式化，`searchOption` 规定是否默认显示在过滤栏、如何进行模糊查询等），实现了配置维度的正交性。

### 2.2 噪音消除 (Noise Reduction) 与 DTO 萃取
在 `hooks/schema.js` 中，`buildDtoSchema` 承担了极其关键的作用：**隔离与萃取**。
```javascript
// 伪逻辑：提取 schema 有效信息
if (prop[`${comName}Option`]) {
    // 1. 提取脱离 option 标签的基础通用属性
    // 2. 将当前场景（如 table）下的 option 提升为统一个 "option" 字段，组合为 DTO
}
```
*   这一步骤意味着**“降噪”**：底层的 `schema-table` 或 `schema-search-bar` （属于纯净的 Widget层）永远不会被另一场景的杂乱配置所污染。
*   它们接到的只会是一个为它量身定做的标准 DTO 数据结构。部件层不需要知道业务全貌，这也是面向对象设计中“迪米特法则（最少知识原则）”在前端架构中的绝佳体现。

---

## 3. DSL 如何分版块映射到整个站点

基于上述的结构与提取机制，DSL 是如何从一段静态的 JSON 对象，转换为具有生命力的互动站点的？主要经历了以下三个流转阶段：

### Phase 1：路由编排与数据检索 (Route → Store)
*   **配置绑定**：从代码分析可以看出，具体的 schema 配置（`schemaConfig`）依附在系统的**菜单/路由模型**之上。
*   **激活态响应**：当用户在侧边栏触发点击，`useSchema`这个 Hook 根据 `route.query.key` 去 `menuStore` 里寻址并拉取当前业务的宏观 Schema。

### Phase 2：运行时逻辑转换与适配 (The Processor)
*   由 `hooks/schema.js` 中的 `buildData`函数负责将庞大的 `schemaConfig` 进行**“分流”**：
    *   抽离出 `searchConfig` 和通过萃取得到的 `searchSchema` 供查询动作使用。
    *   抽离出 `tableConfig` 和 `tableSchema` 供表格展示使用。
    *   **智能化适配**：Hook 中还包含业务适配逻辑，比如它会自动读取 URL 查询参数（`route.query`），并将其无缝地反向注入到 `searchSchema` 的 `option.default` 中，从而原生赋能了诸如“页面刷新后保留搜索态”、“链接分享即可见同等搜索结果”等强大功能。

### Phase 3：视图层的精细剥离与沉淀 (View → Panel → Widget)
最终，这些 Schema 数据在 `schema-view` 中被以依赖注入 (`provide`) 的形式推入组件树的下游，完成结构渲染：

1.  **View 层 ([schema-view.vue])**：
    充当最高级的编排者，作为骨架（Skeleton）仅仅负责放置 `search-panel` 与 `table-panel`，处理全局层面的大布局与模块联动。

2.  **Panel 层 (`search-panel`, `table-panel`)**：
    负责**“承接业务上下文”**与提供**“UI 外层装饰”**（如 Card、边距等）。
    以 `table-panel` 为例：它消化了注入的 `tableSchema` 并传递给子组件。在此之上，它更进一步实现了像 [removeHandler] 这样的强业务副作用逻辑（例如包含提示弹窗的危险删除操作、全局通知等）。它隔离了副作用，保护了底层。

3.  **Widget 层 (`schema-search-bar`, `schema-table`)**：
    作为系统中的**原子呈现者**。在防抖函数、分页状态机（如 `schema-table` 中的 100ms 缓冲策略监控数据流）等机制的安全呵护下，它们盲目而忠实地将经过提取处理的 `options` 一一兑现为页面上的 Input 框和 HTML 表格节点。

---

## 4. 架构设计的业务价值与优势

1.  **极致的生产力**：新增任何中台业务的数据浏览页面，开发成本急剧下降——绝大多情况下甚至不需要新增 Vue 组件，只需要在配置文件/后台里组装好 JSON 数据，系统立刻自适应形成闭环。
2.  **强一致性的体验**：由于底层使用了相同的 DTO 和统一的 Widget 体系，不会出现“同样的数值在 A 页面居中对齐，在 B 页面居右对齐”，用户体验始终保持全局一贯的专业感。
3.  **关注点分离边界清晰**：从业务配置（JSON）、数据降噪分发（Hooks），再到包裹了副作用的 Panel、极致纯净渲染的 Widget，四个层级职责互不侵犯，无论是未来的维护，还是底层库（如将 Element-Plus 更换为其他 UI 框架）的替换，都能做到改动点的最小化和精准把控。

这套设计实现了静态模型与动态交互页面的优雅缝合，是非常成熟的**工程化重武器**。
