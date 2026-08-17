---
title: "如何新增博客内容？"
description: "这是一篇基于Icarus主题的Hexo新增文章教程，包含评论、目录等功能适配。"
publishedAt: "2026-01-22T22:00:00+08:00"
tags:
  - "工程实践"
  - "站点与博客"
  - "教程"
  - "Hexo"
  - "Markdown"
draft: false
---


本文详细介绍基于Icarus主题的Hexo博客新增文章全流程，涵盖从文章创建、编辑、本地预览到最终部署的所有操作，同时适配Icarus主题专属功能（目录、评论、代码高亮等）。

## 一、 核心操作流程（从创建到部署）
### 步骤1：终端创建文章/草稿
在Hexo博客根目录打开终端，执行对应命令创建文章，生成的文件会自动存入指定目录，Icarus主题可正常渲染。

#### 1.1 创建正式文章（推荐）
```bash
# 完整命令
hexo new "你的博客文章标题"
# 简写命令（更高效，推荐使用）
hexo n "Hexo Icarus 主题新增文章教程"
```

#### 1.2 创建草稿（先撰写后发布）
如果暂不想公开，可先创建草稿进行编辑：
```bash
# 创建草稿（生成到 source/_drafts/ 目录）
hexo new draft "草稿标题"
# 预览草稿（需添加 -d 参数）
hexo s -d
# 发布草稿（自动移动到 source/_posts/ 目录，转为正式文章）
hexo publish "草稿标题"
```

#### 1.3 关键注意点
1.  文章标题含空格时，必须用英文引号括起来。
2.  文件名建议使用英文/拼音，避免出现渲染异常。
3.  若开启`post_asset_folder: true`（Hexo根目录`_config.yml`），创建文章时会生成同名文件夹，用于存放文章配图，方便管理。

### 步骤2：编辑Markdown文章文件
打开`source/_posts/`目录下生成的`.md`文件，按照「Front-Matter配置 + Markdown正文」的结构进行编辑。

#### 2.1 必配Front-Matter（Icarus主题兼容）
这是文章的配置头部，决定Icarus主题的渲染效果，核心配置如下：
```yaml
---
# 文章核心信息
title: Hexo Icarus 主题新增文章教程  # 文章标题
date: 2026-01-22 22:00:00  # 发布日期（自动生成，可手动修改）
updated: 2026-01-22 23:30:00  # 更新日期（可选，不同与date时会显示在文章底部）
categories:  # 多级分类（对应侧边栏Categories widget）
  - Hexo教程(父类)
  - Icarus主题(子类)
tags:  # 文章标签（对应侧边栏Tags widget，最多显示10个）
  - Hexo
  - Icarus
  - 博客搭建
# Icarus主题专属配置
excerpt: 这是一篇基于Icarus主题的Hexo新增文章教程，包含评论、目录等功能适配。  # 列表页显示的摘要
toc: true  # 开启左侧自动生成目录（对应toc widget）
comments: true  # 开启底部Gitalk评论框（关闭则不显示）
---
```

#### 2.2 Front-Matter关键说明
- `toc: true`：配合你配置的左侧TOC部件，自动生成1-3级标题目录，支持跳转。
- `comments: true`：触发已配置的Gitalk评论框，无需额外修改，部署后即可显示。
- 代码高亮：无需额外配置，Icarus已预设`atom-one-light`主题，正文代码块会自动高亮并附带复制按钮。

#### 2.3 编写Markdown正文（Icarus自动渲染）
Front-Matter下方使用标准Markdown语法编写正文即可，Icarus会自动渲染以下特色功能：
1.  代码块：自动高亮、带复制按钮、默认展开（配置`fold: unfolded`）。
2.  图片：推荐放入文章同名文件夹，引用格式`![图片描述](文章标题/图片名.webp)`。
3.  阅读时间：自动计算并显示在文章标题下方（配置`readtime: true`）。
4.  更新时间：`updated`与`date`不同时，自动显示在文章底部（配置`update_time: auto`）。

#### 2.4 正文示例（可直接复制测试）
```markdown
## 一、核心创建命令回顾
创建正式文章的核心终端命令：
```bash
# 简写命令，高效创建
hexo n "你的文章标题"
```

### 二、Icarus主题功能验证要点
1.  左侧是否自动生成TOC目录（依赖`toc: true`配置）。
2.  代码块是否有原子白高亮效果，且右侧带有复制按钮。
3.  文章底部是否显示Gitalk评论框（需登录GitHub账号）。

### 三、图片引用示例（推荐方式）
开启`post_asset_folder: true`后，图片引用格式如下：
`![Icarus主题LOGO](新增文章教程/icarus-logo.png)`
```

## 步骤3：本地预览（验证功能是否生效）
编辑完成后，先进行本地预览，避免部署后出现问题，优先排查功能异常。

### 3.1 启动本地预览服务器
```bash
# 清除旧缓存 + 启动本地服务器（默认端口4000）
hexo clean && hexo s
```

#### 3.2 验证核心功能
在浏览器访问`http://localhost:4000`，逐一检查以下内容：
1.  新文章是否出现在首页、对应分类页、对应标签页中。
2.  文章左侧TOC目录是否正常显示，且跳转功能可用。
3.  代码块是否高亮，复制按钮是否可以正常使用。
4.  文章底部Gitalk评论框是否显示（即使提示“未找到相关Issue”，也说明配置正常）。

### 步骤4：生成静态文件并一键部署
本地预览无误后，执行命令发布到GitHub Pages，完成博客更新。

#### 4.1 部署终端命令
```bash
# 清除缓存 → 生成静态文件 → 部署到GitHub Pages
hexo clean && hexo g -d
```

#### 4.2 部署注意点
1.  GitHub Pages存在1-3分钟延迟，部署后无需立即刷新，等待片刻再访问。
2.  Gitalk评论框首次使用时，需登录GitHub账号，点击“初始化评论”自动创建对应Issue，之后即可正常评论。

## 二、 Icarus主题专属注意事项
### 1. Gitalk评论功能生效补充
- 确保公开仓库`repo: blog-comments`已创建完成。
- 确保`client_id`和`client_secret`与GitHub OAuth App信息一致。
- 若评论框报错，检查`proxy`地址（你配置的`https://gh-proxy.com/`可解决国内访问问题）是否可用。

### 2. 图片路径优化建议
- 优先开启`post_asset_folder: true`，图片放入文章同名文件夹，引用更便捷且无加载异常。
- 图片名避免使用中文，建议采用「英文/拼音+连字符」命名（如`icarus-logo.webp`）。

### 3. 侧边栏Widget自动同步
- 左侧侧边栏（分类、目录、友情链接）、右侧侧边栏（最新文章、归档、标签）会自动同步新文章的`categories`和`tags`，无需手动修改配置。

### 4. 数学公式支持
- 已开启`mathjax: true`，文章中可直接使用MathJax语法插入数学公式（如`$E=mc^2$`），Icarus会自动渲染。

## 三、 总结
1.  核心流程：`hexo n "标题"` → 编辑Markdown（适配Front-Matter） → `hexo clean && hexo s`预览 → `hexo clean && hexo g -d`部署。
2.  关键适配：Front-Matter中开启`toc: true`和`comments: true`，对应Icarus主题的目录和Gitalk评论功能。
3.  避坑要点：本地预览优先于部署，可提前验证所有功能，减少返工成本。
