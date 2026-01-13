import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/elpisDoc/',
  title: "elpis",
  description: "elpis document ",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown 示例', link: '/markdown-examples' },
          { text: 'Runtime API 示例', link: '/api-examples' },
          { text: '里程碑1', link: '/milestone1' },
          { text: '里程碑2', link: '/milestone2' },
          { text: '里程碑3', link: '/milestone3' },
          { text: '里程碑4', link: '/milestone4' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://git.code.tencent.com/sailornpg/elpis' }
    ]
  }
})
