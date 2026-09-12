# 收窄 global.css 的 interface

`global.css` 只拥有全站设计 token、基础元素与可访问性规则、`BaseLayout` 外壳，以及具有多个语义相同消费者的共享原语。依赖单个页面或 Astro module DOM 的选择器改由该页面或 module 所有；仅有相似外观不构成共享 module，避免用全站 class 与 DOM 层级网络换取表面的集中管理。

2026-09-12 修订：搜索不再由 `BaseLayout` / `global.css` 所有。外壳只在主导航提供位置；Pagefind 装配、可用状态、主题映射与 live region 补丁改由搜索 module 所有（ADR-0032）。

这条 seam 保留全站主题与外壳的一致 interface，同时把页面视觉、`PostTags`、单篇技术文章宽度和 `MarkdownBody` 代码色等实现知识收回其真实所有者。页面直接拥有的 DOM 使用同文件内 Astro 默认 scoped `<style>`；只有多个 module 共同拥有同一规则时才局部导入共享 CSS，`<style is:global>` 仅用于暂时无法由真实所有者承接的跨 module DOM，静态视觉不写成内联 `style`。

迁移按最小试点推进，第一轮选择 `/tags/` 标签索引且不新增 CSS 文件；迁移只改变 CSS ownership，不重议 ADR-0013 与 ADR-0014 已验收的视觉或交互，也不顺手调整颜色、间距、字体或动画。迁移中发现的视觉问题另行记录和决策。

验收继续穿过构建后页面这一可观察 interface：保持 DOM 语义、链接、视觉和交互，复用现有桌面与移动端可达性及无横向溢出检查，并为标签 chip 补充一组最小浏览器断言，覆盖布局、纸面背景、边框和悬停缩放。测试不读取 CSS 源文件、文件位置或 Astro scope 属性，避免把 implementation 固化成合同。

迁移作为一次性交付完成，但内部按 owner 分批推进；每批独立检查并形成单独 Git 提交，通过后自动进入下一批。标签索引试点由实施者检查桌面与手机的亮色、暗色四种画面，不设置中途客户确认；最终由客户统一验收。若最终验收失败，按批次提交定位、修复或撤回根因，而非重做整次迁移。

迁移不设 `global.css` 行数或 CSS 文件数量指标。成功以页面改动的影响可被限制在真实 owner、样式位置可发现、共享规则确有共同语义，以及既有产品表现不变为准；机械按文件或选择器区段切分不算完成。

## Ownership

- **全站基础与外壳**：`global.css` 保留主题、字体和壳层 token，基础元素与可访问性规则，`BaseLayout` 的页眉、导航、主题切换、主区和页脚，以及 `.page-shell`、`.empty-state` 等确有共同语义的全站原语。全局断点只保留这些 owner 的响应式规则。
- **搜索**：Pagefind 装配、是否启用、主题映射与可访问性补丁由搜索 module 所有；外壳只提供导航位置。`--pf-*` 不是全站 token。
- **页面**：首页、标签索引、标签详情、归档、说说、关于和单篇技术文章各自拥有其排版与视觉；页面响应式规则跟随页面 owner。页面直接渲染的 DOM 优先使用同文件 scoped style，跨子 module 的情境布局才在页面内使用最小 global selector。
- **可复用 module**：`MarkdownBody`、`PostTags`、`PostToc` 各自拥有内部视觉。`--code-*` 只属于 `MarkdownBody`；`--reading-width` 属于单篇技术文章组合，并由目录继承使用，不再作为全站 token。
- **真实共享视觉**：首页说说预览与说说列表卡片继续遵守 ADR-0013 的同一视觉合同，由两处局部导入的共享 CSS 承接；归档卡等仅外观相似的结构不并入该 module。跨 owner 的组合选择器拆回各 owner，不为少量相同声明新增通用 class 或 module。

最终验收覆盖首页、技术文章、说说、归档、标签索引、标签详情和关于页，逐类比较桌面与手机的亮色、暗色画面，并运行现有整站功能检查。
