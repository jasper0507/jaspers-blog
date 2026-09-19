## Agent skills

### Issue tracker

Issues are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain layout. See `docs/agents/domain.md`.

### Publishing

源码仓全部改动走 PR，等 `verify` 与 `browser-smoke` 通过后再合并。写作内容由私有内容仓维护，内容推送与源码合并统一进入内容仓发布。部署配置、首次切换或故障恢复时读取 `docs/deployment.md`；两仓职责见 `docs/adr/0034-separate-content-repository.md`。创作者发布命令以推送为终点，见 `docs/adr/0035-creator-publish-ends-at-push.md`；日用入口为 Make，见 `docs/adr/0036-make-as-daily-command-surface.md`。

### Verification

选择覆盖改动的最小验证集合；一个高层入口已覆盖这些检查时只跑该入口一次。失败后只跑能隔离原因的最小子检查，不重复已通过项。子进程或本地服务受沙箱限制时，获批后原样重跑，不修改项目来适配代理环境。
