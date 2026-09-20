---
status: accepted
---

# 技术文章写作规则由共享 module 判定

本机发布前校验与网站构建曾各自实现技术文章头信息约束，trim、缺省标签和整数范围不一致，相同输入会被一端接受、另一端拒绝。判定以构建侧语义为准，收紧本机，不放宽 Astro。

共享 `post-writing-rules` 只做两件纯操作：整份头信息校验并归一化，以及全体技术文章（含草稿）的标签网址冲突检查。它不读文件、不依赖 Astro/Zod、不调用 Git、不改写输入或作者 Markdown。本机入口继续负责 YAML 子集解析、发布时间必须加引号、文件名、正文、计数器和稳定 ID；Astro 入口继续负责 loader，把原始输入交给共享 module，把 issues 转成带原字段路径的 Zod issues，并在成功后把 `publishedAt` 转成 `Date`。两端不是可互换 adapter，也不引入依赖注入。

内容工具保持零运行时依赖。接受 Astro 自动生成的头信息 JSON schema 字段描述变少，不为编辑器提示另建生成器。
