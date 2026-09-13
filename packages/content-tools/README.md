# 内容创建工具

需要 Node.js >=24.11.0，无运行时依赖。在内容仓安装本包后运行：

```sh
jasper-content new:post "文章标题"
jasper-content new:shuoshuo
```

以当前目录为内容仓，写入 `posts/` 和 `shuoshuo/`，不访问 Git 或网络。创建文章前必须已有有效的 `post-next-id.json`；迁移时保留既有计数器，只有全新空内容仓才可初始化为 `{"next": 1}`。同名不覆盖、失败不占号、删除不回收号码。

沿用网站模板：上海时间、永久稳定 ID、`draft: false`。创建后补齐文章摘要和正文或说说正文；暂不发布时改为 `draft: true`。网站构建还需要 `about.md`（可以为空）和两个内容子目录。

本包不提供网站预览或发布命令。源码仓维护领域实现，内容仓无需复制实现或安装 Astro。
