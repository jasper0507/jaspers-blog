## Agent skills

### Issue tracker

Issues are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain layout. See `docs/agents/domain.md`.

### Verification

选择覆盖改动的最小验证集合；一个高层入口已覆盖这些检查时只跑该入口一次。失败后只跑能隔离原因的最小子检查，不重复已通过项。子进程或本地服务受沙箱限制时，获批后原样重跑，不修改项目来适配代理环境。
