# 技术文章阅读收成一个 module

单篇路由曾同时摆放标题区、正文、目录和回顶，而回顶的零参数 interface 仍去找 `#post-title` 与 `.post-header`。把阅读目标、观察器与焦点约定收进阅读 module；路由只提供已发布技术文章、SEO 与页面壳。目录与回顶保留为内部 implementation，浏览器 DOM 是现有 seam，不引入假 DOM 或 ObserverFactory。
