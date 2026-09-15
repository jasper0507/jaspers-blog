# 迁移旧 Hexo 文章

从 `D:\MyBlog\ckblogs\source\_posts` 迁移现有 Markdown 内容。16 个 Markdown 文件中迁移 15 篇正式文章，排除 Hexo 默认示例 `hello-world.md`；源目录仅作为迁移输入，不在原处修改。

迁移后的文章统一采用新站内容结构与永久链接规则，不保留旧 URL，也不生成重定向。

迁移完成后，旧 Hexo 目录只作为只读历史备份，不建设双向同步工具。正式写作位置后来由 ADR-0034
迁入私有内容仓；本段不再定义当前内容路径。

旧文章的 `categories` 与 `tags` 在迁移时合并并去重，新站只保留 `tags`，以后发布文章也不再维护独立分类。

旧 `date` 作为发布时间，`updated` 作为更新时间，未带时区的旧时间统一按 `Asia/Shanghai` 解释。首页、文章列表和归档按发布时间排序；文章更新后不重新置顶，文章页同时显示发布时间和更新时间。

新站页面模板负责渲染唯一的文章标题 `H1`。迁移时将正文标题整体下移一级；若旧正文会因此相对前一个标题跳级，则只提升到相邻的下一层。与文章标题重复的首个正文标题直接删除；转换必须识别代码围栏，不改动代码块中的 `#` 注释。旧正文中紧邻普通文本的 `---` 前补一个空行，避免被 Markdown 误识别为 Setext 标题。除此之外不改写正文措辞或章节顺序。

## 迁移时文件名

下表只记录迁移结果，不是当前技术文章目录；后续文件名与网址规则见 ADR-0024。

| 原文件                                           | 新文件名                            |
| ------------------------------------------------ | ----------------------------------- |
| `零基础利用Github、Hexo搭建个人博客-超详细版.md` | `github-hexo-blog-guide.md`         |
| `LoRA-FAIR论文精读.md`                           | `lora-fair-paper-notes.md`          |
| `Go语言笔记-长期更新.md`                         | `go-notes.md`                       |
| `git新手入门参考.md`                             | `git-beginner-guide.md`             |
| `Gin笔记-长期更新.md`                            | `gin-notes.md`                      |
| `FedRD论文精读.md`                               | `fedrd-paper-notes.md`              |
| `DSFedMed论文精读.md`                            | `dsfedmed-paper-notes.md`           |
| `DEeR论文精读.md`                                | `deer-paper-notes.md`               |
| `如何新增博客内容？.md`                          | `hexo-icarus-content-guide.md`      |
| `Transformer论文逐段精读.md`                     | `transformer-paper-notes.md`        |
| `Markdown快速上手语法.md`                        | `markdown-quick-start.md`           |
| `新手安装Docker教程（Windows11-WSL2）.md`        | `docker-on-windows-wsl2.md`         |
| `数据结构与算法-长期更新.md`                     | `data-structures-and-algorithms.md` |
| `深度学习笔记.md`                                | `deep-learning-notes.md`            |
| `计算机网络笔记.md`                              | `computer-networks-notes.md`        |
