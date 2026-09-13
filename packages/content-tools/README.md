# 内容创建与发布工具

需要 Node.js >=24.11.0，无运行时依赖。在内容仓安装本包后运行：

```sh
jasper-content new:post "文章标题"
jasper-content new:shuoshuo
jasper-content publish
jasper-content publish "发布 Go 并发笔记"
```

以当前目录为内容仓。创建命令写入 `posts/` 和 `shuoshuo/`，不访问 Git 或网络。创建文章前必须已有有效的 `post-next-id.json`；迁移时保留既有计数器，只有全新空内容仓才可初始化为 `{"next": 1}`。同名不覆盖、失败不占号、删除不回收号码。

沿用网站模板：上海时间、永久稳定 ID、`draft: false`。创建后补齐文章摘要和正文或说说正文；暂不发布时改为 `draft: true`。网站构建还需要 `about.md`（可以为空）和两个内容子目录。

`publish` 展示并提交写作内容（`posts/`、`shuoshuo/`、`about.md`、`post-next-id.json`）的新增、修改和删除，不夹带入口脚本、配置或工作流，不修改 `draft`。已有未推送内容提交会继续推送；无新内容改动且远端已是最新时不制造空提交，改为重新触发远端发布。推送成功不等于上线：命令关联本次内容提交或重试对应的工作流任务，按校验、构建、部署报告结果。推送失败或远端超前时保留本地提交、不强推。本机需已安装并登录 GitHub CLI。

源码仓维护领域实现，内容仓无需复制实现或安装 Astro。创作者说明见 `content-repo/README.md`；工作流凭据与切换交接见源码仓 `docs/deployment.md`。
