---
status: accepted
---

# 创作者发布命令以 git push 为终点

创作者本机不再调用 GitHub CLI、不等待校验/构建/部署收据，也不在没有新写作时重试发布任务。
`publish` 只提交写作路径并推送；干净且已与远端同步时打印「没有新的写作要提交」后退出。
上线仍由内容仓 `publish.yml` 经 Wrangler 上传，Pages Git 自动部署保持关闭（ADR-0034）。
没有新写作却要再部署时，由开发者在 Actions 手动重跑。本机不再报告「已上线」。
