---
status: accepted
---

# 人类日用入口改为 Make

内容仓和源码仓的日用命令改为 Make，避免 `npm run … --` 的长度和参数分隔。
无参数的 `make` 只打印可复制命令行。内容仓第一次 `make init`（检查 Node 后 `npm ci`），
之后 `make post t="标题"`、`make shuoshuo`、`make publish m="说明"`。
源码仓同样 `make init`，并包一层 `dev` / `build` / `preview` / `check` / `test` /
`test-smoke` / `fonts-fetch`。npm scripts 留作实现；源码仓 CI 继续跑 npm。
内容仓删除创作者 npm script，避免第二套入口。
