# 高星静态博客的发布恢复与浏览器测试做法（2026-08-27）

## 结论

调研的 4 个高星 Astro 博客模板和 1 个 Hugo 基准都把自动门禁集中在 **build / type check / lint / format**；没有项目配置 Chrome、Firefox、Safari 三浏览器自动测试矩阵。它们也没有在仓库内实现专用回滚脚本或恢复工作流，恢复能力留给 Git 和托管平台。

因此本站不需要用“生产级”为由增加多浏览器 CI 或发布包装：普通内容发布只跑 `npm run build`，再用原始 Git 命令提交和推送；线上错误用 `git revert <错误提交>` 后 `git push` 恢复。界面代码变更才运行精简后的单浏览器冒烟测试。

## 范围与方法

样本优先选择和本站相近、仍在维护的高星博客模板。Stars 和最近 push 来自 2026-08-27 的 GitHub REST 仓库元数据快照；`updated_at` 会被 star 等非代码活动改变，因此维护状态采用 `pushed_at`。

逐仓库检查了默认分支的递归文件树、`package.json`、`.github/workflows/*` 和 README，并搜索项目自有的 Playwright、Cypress、Vitest、Jest、`test` / `spec` 文件，以及 `rollback`、`revert` 和浏览器名称。下文的“未发现”只表示这些范围内没有配置或说明，不表示作者在仓库外从未手工测试或恢复。

| 项目                                                                                      |                                                                   Stars | 最近 push  | 选择理由                                                |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------: | ---------- | ------------------------------------------------------- |
| [satnaing/astro-paper](https://github.com/satnaing/astro-paper)                           |              [4,999](https://api.github.com/repos/satnaing/astro-paper) | 2026-08-05 | 本站的结构来源之一，Astro + Pagefind + Cloudflare Pages |
| [saicaca/fuwari](https://github.com/saicaca/fuwari)                                       |                    [4,948](https://api.github.com/repos/saicaca/fuwari) | 2026-03-10 | 高星 Astro 静态博客，包含独立创建文章命令               |
| [chrismwilliams/astro-theme-cactus](https://github.com/chrismwilliams/astro-theme-cactus) | [1,722](https://api.github.com/repos/chrismwilliams/astro-theme-cactus) | 2026-07-25 | Astro 静态博客，支持文章和 notes，提供多平台部署说明    |
| [cworld1/astro-theme-pure](https://github.com/cworld1/astro-theme-pure)                   |          [1,050](https://api.github.com/repos/cworld1/astro-theme-pure) | 2026-08-21 | 中文向 Astro 博客与主题包                               |
| [adityatelange/hugo-PaperMod](https://github.com/adityatelange/hugo-PaperMod)             |      [13,866](https://api.github.com/repos/adityatelange/hugo-PaperMod) | 2026-08-02 | 非 Astro 的高星静态博客基准                             |

以上仓库在快照时均未归档。

## 逐项目证据

### AstroPaper

- [`package.json`](https://github.com/satnaing/astro-paper/blob/main/package.json) 的 `build` 依次执行 `astro check`、`astro build`、Pagefind 索引；另有 ESLint 和 Prettier 命令，没有 `test` 命令或浏览器测试依赖。
- [CI](https://github.com/satnaing/astro-paper/blob/main/.github/workflows/ci.yml) 只在 pull request / `workflow_call` 中运行 lint、format check 和 build，没有部署 job 或浏览器矩阵。
- [README](https://github.com/satnaing/astro-paper/blob/main/README.md) 标明托管为 Cloudflare Pages，并把 `pnpm build` 定义为类型检查、构建和搜索索引。
- 未发现：递归文件树中没有 Playwright/Cypress/Vitest/Jest 配置或项目测试文件；README、package scripts 和唯一 CI workflow 中没有 rollback/revert 流程。

### Fuwari

- [`package.json`](https://github.com/saicaca/fuwari/blob/main/package.json) 提供 Astro check/build、TypeScript check、Biome 和 `new-post`，没有 `test` 命令或浏览器测试依赖。
- [Build and Check workflow](https://github.com/saicaca/fuwari/blob/main/.github/workflows/build.yml) 在 Node 22/23 上分别运行 `astro check` 和 `astro build`；[Code quality workflow](https://github.com/saicaca/fuwari/blob/main/.github/workflows/biome.yml) 只运行 Biome。
- [README](https://github.com/saicaca/fuwari/blob/main/README.md) 的演示站在 Vercel，并让使用者按 Astro 官方指南选择 Vercel、Netlify、GitHub Pages 等平台，没有自定义发布层。
- 未发现：递归文件树、package scripts 和 workflows 中没有 Playwright/Cypress/Vitest/Jest 或三浏览器矩阵；README 和 workflows 中没有 rollback/revert 流程。`src/content/spec/` 是内容集合，不是测试套件。

### Astro Cactus

- [`package.json`](https://github.com/chrismwilliams/astro-theme-cactus/blob/main/package.json) 的核心门禁是 `astro check`、Biome 和 `astro build`，没有测试命令或浏览器依赖。
- [CI](https://github.com/chrismwilliams/astro-theme-cactus/blob/main/.github/workflows/ci.yml) 在 push / pull request 上只运行 `astro check` 和 build。
- [README](https://github.com/chrismwilliams/astro-theme-cactus/blob/main/README.md) 的演示站托管在 Netlify，提供 Netlify/Vercel 一键部署，并把其他平台交给 Astro 官方部署指南。
- 未发现：递归文件树、package scripts 和 workflows 中没有 Playwright/Cypress/Vitest/Jest 或浏览器矩阵；README 和 workflows 中没有 rollback/revert 流程。`content/posts/testing/` 是用于展示 frontmatter 的示例文章，不是自动测试。

### Astro Theme Pure

- 根 [`package.json`](https://github.com/cworld1/astro-theme-pure/blob/main/package.json) 的 build 执行主题检查、`astro check` 和 `astro build`；主题包的 [`package.json`](https://github.com/cworld1/astro-theme-pure/blob/main/packages/pure/package.json) 虽有 `test`，内容只是“no test specified”并退出失败。
- 默认分支递归文件树中没有 `.github/workflows/`；[README](https://github.com/cworld1/astro-theme-pure/blob/main/README.md) 展示 Vercel production deployment，并说明构建 `dist` 后可交给任意静态托管平台。
- 未发现：项目自有 Playwright/Cypress/Vitest/Jest 配置、测试套件、浏览器矩阵或 rollback/revert 流程。

### Hugo PaperMod（基准）

- [Build Check](https://github.com/adityatelange/hugo-PaperMod/blob/master/.github/workflows/build-check.yml) 只安装 Hugo 并执行一次静态构建。
- [GitHub Pages workflow](https://github.com/adityatelange/hugo-PaperMod/blob/master/.github/workflows/gh-pages.yml) 负责 Hugo build、上传产物并用官方 action 部署，没有浏览器测试或自定义回滚 job。
- 未发现：递归文件树、README 和 workflows 中没有 Playwright/Cypress/Vitest/Jest、三浏览器矩阵或 rollback/revert 说明。

## 托管平台的恢复能力

仓库没有实现回滚，不等于托管平台没有恢复能力：

- [Cloudflare Pages Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/) 可以把生产流量立即切回任一成功的历史 production deployment；preview deployment 不能作为目标。
- [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback) 同样把域名切回既有部署；Hobby 计划限上一个生产部署，Pro/Enterprise 可选择其他合格历史部署。

这些是平台能力，不是上述模板仓库里的逻辑。Cloudflare Pages 回滚会让线上版本暂时偏离 Git 生产分支；本站既然选择 Git 为唯一事实来源，就不需要把平台回滚包装成日常命令。

## 对本站的最小建议

1. **普通内容发布**：只运行 `npm run build`，成功后使用 `git add -A`、`git commit`、`git push`。不增加发布脚本、Git hook 或远端多浏览器门禁。
2. **恢复**：默认只用 `git revert <错误提交>` + `git push`，让 Cloudflare Pages 从可审计的新提交重新部署。Cloudflare 历史回滚仅作为必须秒级恢复时的应急开关；当前静态个人博客不需要把它加入标准流程。
3. **浏览器测试**：普通文章或说说变更不跑 Playwright。页面、样式或客户端交互变更时，只跑一条 Chromium 高层冒烟，覆盖导航、主题和搜索等真实用户路径；Firefox/Safari 在大改版或出现实际兼容缺陷时再手工核对。
4. **升级门禁**：Astro、Node 或关键依赖升级时运行精简后的完整 `npm test`，但不默认增加 Firefox/WebKit 自动矩阵。只有真实跨浏览器回归反复发生时才增加对应的单个回归用例。

这与样本的共同做法一致，也符合本站已经确定的边界：Astro、Cloudflare Pages、原始 Git 发布、外部可用性监控另做、测试反过度。
