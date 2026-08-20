# 技术文章发布使用单快照 deep module

技术文章的 Astro collection entry 曾直接泄漏给首页、归档、标签、单篇、RSS 和 sitemap，导致调用方重复掌握字段结构、日期、标签与 permalink 规则。技术文章发布 module 的 seam 设在 Astro collection 校验之后、所有消费方之前：`content.config.ts` 继续负责 loader、schema 与 intake 校验，`posts.ts` 负责读取、正文校验、草稿过滤、稳定排序以及公开投影，从而不重复封装 Astro intake。

module 只提供一个已发布技术文章快照，包含技术文章、归档分组和标签分组；技术文章投影拥有 slug、href、标题、摘要、统一日期投影、可链接标签及隐藏 raw entry 的 `render()` 能力，不暴露 `CollectionEntry`、`data`、`body`、`draft` 或日期与标签辅助函数。快照保持现有不变量：草稿也必须完整有效，技术文章按发布时间降序且同时间按稳定 ID 升序，归档按年份降序，标签按文章数降序且同数量按 `zh-CN` 标签名排序。

技术文章与说说继续是两个独立 module，首页与 RSS 只在输出层组合两者；迁移一次替换全部调用方，不增加兼容 adapter、统一内容层或缓存。两者即使当前使用相同的紧凑日期格式，也各自在 implementation 内拥有日期投影，不为这几行代码建立共享日期 interface。现有整站构建、交互和视觉冒烟继续保留，技术文章 fixture 改为穿过新 interface 验证草稿排除、排序、日期、permalink、归档、标签和正文渲染，标签网址冲突通过预期构建失败的 fixture 验证；本重构不改变访客或作者行为。
