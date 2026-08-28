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

## 补充：内容直发与代码 PR / CI（2026-08-28）

本节继续使用同一组样本，核对默认分支保护、工作流触发器以及内容提交是否经过 PR。公开 branch API 能给出 `protected` 布尔值，但经典 branch protection 详情接口对五个仓库均返回 `401 Requires authentication`；因此表中只确认保护是否存在，以及公开 ruleset API 能返回的规则，未公开的经典规则细节标为未知。`content-only` 指该提交的全部改动均位于当时的内容目录；AstroPaper 和 Astro Cactus 曾迁移内容目录，检查同时覆盖了迁移前后的路径。

| 项目                                                                 | 默认分支与公开保护                                                                                                                                                                                                                                                                                                                                      | workflow 触发与 paths                                                                                                                                                                                                                                                                                                                                    | 最近可识别的 content-only 提交                                                                                                                                                                                                                                                                                                                                             | 默认分支维护者无关联 PR 的写入实例                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AstroPaper](https://github.com/satnaing/astro-paper)                | `main`；[branch API](https://api.github.com/repos/satnaing/astro-paper/branches/main) 为 `protected: true`，[经典保护详情](https://api.github.com/repos/satnaing/astro-paper/branches/main/protection) 需要认证，[rulesets](https://api.github.com/repos/satnaing/astro-paper/rulesets) 返回空数组，具体规则未知                                        | [CI](https://github.com/satnaing/astro-paper/blob/main/.github/workflows/ci.yml) 仅 `pull_request` 和 `workflow_call`，没有 `push` 或 paths 过滤                                                                                                                                                                                                         | [`c20d747`](https://github.com/satnaing/astro-paper/commit/c20d747f38ec5f3d5d5dc19856fe4dfc955366a9) 只改一篇 `src/data/blog/` 文章；[关联 PR API](https://api.github.com/repos/satnaing/astro-paper/commits/c20d747f38ec5f3d5d5dc19856fe4dfc955366a9/pulls) 返回 [#605](https://github.com/satnaing/astro-paper/pull/605)                                                 | [`4c33a60`](https://github.com/satnaing/astro-paper/commit/4c33a60529f9c443145a89fe526ff231c009272d) 由 Sat Naing 更新版本；[关联 PR API](https://api.github.com/repos/satnaing/astro-paper/commits/4c33a60529f9c443145a89fe526ff231c009272d/pulls) 返回空数组                                    |
| [Fuwari](https://github.com/saicaca/fuwari)                          | `main`；[branch API](https://api.github.com/repos/saicaca/fuwari/branches/main) 为 `protected: false`，[rulesets](https://api.github.com/repos/saicaca/fuwari/rulesets) 返回空数组                                                                                                                                                                      | [Build](https://github.com/saicaca/fuwari/blob/main/.github/workflows/build.yml) 和 [Biome](https://github.com/saicaca/fuwari/blob/main/.github/workflows/biome.yml) 均为 `push: main` + `pull_request: main`，没有 paths 过滤                                                                                                                           | [`ec179a2`](https://github.com/saicaca/fuwari/commit/ec179a21270d69f256f8d35e53867d1330fb9278) 只改一篇 `src/content/posts/` 示例文章；[关联 PR API](https://api.github.com/repos/saicaca/fuwari/commits/ec179a21270d69f256f8d35e53867d1330fb9278/pulls) 返回空数组                                                                                                        | 同一 [`ec179a2`](https://github.com/saicaca/fuwari/commit/ec179a21270d69f256f8d35e53867d1330fb9278) 由仓库所有者 saicaca 提交到可达 `main` 的历史，且无关联 PR                                                                                                                                    |
| [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) | `main`；[branch API](https://api.github.com/repos/chrismwilliams/astro-theme-cactus/branches/main) 为 `protected: true`，[经典保护详情](https://api.github.com/repos/chrismwilliams/astro-theme-cactus/branches/main/protection) 需要认证，[rulesets](https://api.github.com/repos/chrismwilliams/astro-theme-cactus/rulesets) 返回空数组，具体规则未知 | [CI](https://github.com/chrismwilliams/astro-theme-cactus/blob/main/.github/workflows/ci.yml) 为 `push: main` + `pull_request: main`，没有 paths 过滤                                                                                                                                                                                                    | [`b5ec010`](https://github.com/chrismwilliams/astro-theme-cactus/commit/b5ec010f28affcf1e70b76849ef31ae6697c057c) 只移动一篇 `src/content/post/` 示例文章；[关联 PR API](https://api.github.com/repos/chrismwilliams/astro-theme-cactus/commits/b5ec010f28affcf1e70b76849ef31ae6697c057c/pulls) 返回 [#457](https://github.com/chrismwilliams/astro-theme-cactus/pull/457) | [`7b6281c`](https://github.com/chrismwilliams/astro-theme-cactus/commit/7b6281c1e98a8a31b5868e2f4bf8f868504e7bf8) 由 Chris Williams 更新版本；[关联 PR API](https://api.github.com/repos/chrismwilliams/astro-theme-cactus/commits/7b6281c1e98a8a31b5868e2f4bf8f868504e7bf8/pulls) 返回空数组     |
| [Astro Theme Pure](https://github.com/cworld1/astro-theme-pure)      | `main`；[branch API](https://api.github.com/repos/cworld1/astro-theme-pure/branches/main) 为 `protected: true`；公开 [`main` ruleset](https://api.github.com/repos/cworld1/astro-theme-pure/rulesets/2652650) 只禁止删除和非快进更新，不要求 PR 或状态检查                                                                                              | [Actions API](https://api.github.com/repos/cworld1/astro-theme-pure/actions/workflows?per_page=100) 只列出 GitHub 动态 Copilot workflow；默认分支没有仓库自有 `.github/workflows/`，因而没有可核对的 build CI `push` / `pull_request` / paths 配置                                                                                                       | [`2b9c293`](https://github.com/cworld1/astro-theme-pure/commit/2b9c29322a27e1395f743336aefcbf95d188c846) 只改一篇 `src/content/docs/` 文档；[关联 PR API](https://api.github.com/repos/cworld1/astro-theme-pure/commits/2b9c29322a27e1395f743336aefcbf95d188c846/pulls) 返回 [#174](https://github.com/cworld1/astro-theme-pure/pull/174)                                  | [`0047f6d`](https://github.com/cworld1/astro-theme-pure/commit/0047f6d4278d4c3e823dca608022cd6ebe7b5c96) 由 CWorld 提交；[关联 PR API](https://api.github.com/repos/cworld1/astro-theme-pure/commits/0047f6d4278d4c3e823dca608022cd6ebe7b5c96/pulls) 返回空数组                                   |
| [Hugo PaperMod](https://github.com/adityatelange/hugo-PaperMod)      | `master`；[branch API](https://api.github.com/repos/adityatelange/hugo-PaperMod/branches/master) 为 `protected: true`；公开 [`primary rule`](https://api.github.com/repos/adityatelange/hugo-PaperMod/rulesets/14934497) 对默认分支禁止删除和非快进更新，要求 `build-check`、签名和 code-quality errors，但没有 required-PR 规则                        | [Build Check](https://github.com/adityatelange/hugo-PaperMod/blob/master/.github/workflows/build-check.yml) 为 `push` + `pull_request`，分支是 `master` / `exampleSite`；忽略 `images/**`、`LICENSE`、`README.md`。[Pages](https://github.com/adityatelange/hugo-PaperMod/blob/master/.github/workflows/gh-pages.yml) 仅 `push` 同两分支，使用相同忽略项 | 默认 `master` 没有 `content/`；内容位于 `exampleSite`。该分支最近 content-only [`d6a64e3`](https://github.com/adityatelange/hugo-PaperMod/commit/d6a64e379e20bce80fc7a58ed36df63c118af09c) 只改一篇文章，[关联 PR API](https://api.github.com/repos/adityatelange/hugo-PaperMod/commits/d6a64e379e20bce80fc7a58ed36df63c118af09c/pulls) 返回空数组                         | 默认分支上的 [`d376885`](https://github.com/adityatelange/hugo-PaperMod/commit/d3768854d00ad003b0a8dbdba254ce9224377a01) 由 Aditya Telange 更新 README；[关联 PR API](https://api.github.com/repos/adityatelange/hugo-PaperMod/commits/d3768854d00ad003b0a8dbdba254ce9224377a01/pulls) 返回空数组 |

五个样本都能找到“维护者提交已进入默认分支且 `commits/{sha}/pulls` 返回空数组”的实例，但 GitHub 公共 API 不记录 Git transport。证据能确定这些写入没有关联 PR，不能进一步绝对证明它们来自命令行 `git push`，而不是网页编辑或其他直接写入 API。样本中也没有一个能证明在同一默认分支上按内容路径自动实行“代码必须 PR、内容允许直发”；Fuwari 和 Astro Cactus 是直写默认分支也运行 push CI，PaperMod 则把演示内容放在单独的 `exampleSite` 分支。

### 本站约束

[GitHub 的 required-PR 规则](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-a-pull-request-before-merging) 要求目标分支的提交先进入非目标分支并通过 PR，不提供按变更路径放行的条件。因此，同一 `main` 上保留内容直发只能依靠[指定 actor 的 bypass](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository#granting-bypass-permissions-for-your-branch-or-tag-ruleset)，或不启用 required-PR；不能仅凭提交只改了内容目录就自动例外。
