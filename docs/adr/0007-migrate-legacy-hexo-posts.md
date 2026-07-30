# 迁移旧 Hexo 文章

从 `D:\MyBlog\ckblogs\source\_posts` 迁移现有 Markdown 内容。16 个 Markdown 文件中迁移 15 篇正式文章，排除 Hexo 默认示例 `hello-world.md`；源目录仅作为迁移输入，不在原处修改。

迁移后的文章统一采用新站内容结构与永久链接规则，不保留旧 URL，也不生成重定向。

迁移完成后，旧 Hexo 目录只作为只读历史备份；新项目的 `src/content/` 是后续新增与修改内容的唯一来源，不建设双向同步工具。

旧文章的 `categories` 与 `tags` 在迁移时合并并去重，新站只保留 `tags`，以后发布文章也不再维护独立分类。

旧 `date` 作为发布时间，`updated` 作为更新时间，未带时区的旧时间统一按 `Asia/Shanghai` 解释。首页、文章列表和归档按发布时间排序；文章更新后不重新置顶，文章页同时显示发布时间和更新时间。

新站页面模板负责渲染唯一的文章标题 `H1`。迁移时将正文标题整体下移一级，与文章标题重复的首个正文标题直接删除；转换必须识别代码围栏，不改动代码块中的 `#` 注释。除此之外不改写正文措辞或章节顺序。

## 永久短名

| 原文件 | 新文件名 |
| --- | --- |
| `零基础利用Github、Hexo搭建个人博客-超详细版.md` | `github-hexo-blog-guide.md` |
| `LoRA-FAIR论文精读.md` | `lora-fair-paper-notes.md` |
| `Go语言笔记-长期更新.md` | `go-notes.md` |
| `git新手入门参考.md` | `git-beginner-guide.md` |
| `Gin笔记-长期更新.md` | `gin-notes.md` |
| `FedRD论文精读.md` | `fedrd-paper-notes.md` |
| `DSFedMed论文精读.md` | `dsfedmed-paper-notes.md` |
| `DEeR论文精读.md` | `deer-paper-notes.md` |
| `如何新增博客内容？.md` | `hexo-icarus-content-guide.md` |
| `Transformer论文逐段精读.md` | `transformer-paper-notes.md` |
| `Markdown快速上手语法.md` | `markdown-quick-start.md` |
| `新手安装Docker教程（Windows11-WSL2）.md` | `docker-on-windows-wsl2.md` |
| `数据结构与算法-长期更新.md` | `data-structures-and-algorithms.md` |
| `深度学习笔记.md` | `deep-learning-notes.md` |
| `计算机网络笔记.md` | `computer-networks-notes.md` |
