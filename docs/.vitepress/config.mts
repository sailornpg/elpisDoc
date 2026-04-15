import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/elpisDoc/",
  title: "elpis",
  description: "elpis document ",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Examples", link: "/markdown-examples" },
    ],

    sidebar: [
      {
        text: "Examples",
        items: [
          // { text: 'Markdown 示例', link: '/markdown-examples' },
          // { text: 'Runtime API 示例', link: '/api-examples' },
          { text: "知识图谱文档", link: "/knowledgeDoc" },
          { text: "项目介绍", link: "/abstract" },
          { text: "里程碑1 elpis-core核心实现", link: "/milestone1" },
          { text: "里程碑2 基于webpack5完成工程化建设", link: "/milestone2" },
          { text: "里程碑2.1 基于vite完成工程化建设", link: "/milestone2.1" },
          { text: "里程碑3 基于dsl领域模型架构", link: "/milestone3" },
          { text: "里程碑4 动态组件库封装", link: "/milestone4" },
          { text: "里程碑5 npm发布", link: "/milestone5" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://git.code.tencent.com/sailornpg/elpis" },
    ],
  },
});
