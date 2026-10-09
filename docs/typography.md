# 字体与 Markdown 排版

2026-10-09 作者确认：UI 使用 `anthropic-sans`，技术文章大标题与所有 Markdown 普通文本使用 `anthropic-serif`，行内码与代码块使用 `anthropic-mono`。首页主句、列表标题、日期、标签、目录和搜索均属于 UI，保留各自字号与布局。默认界面文字为 16px / 24px。

三套栈的中文均优先本站 Noto Sans SC，后续才回退系统字体。关于页、技术文章与说说使用同一正文样式。KaTeX 使用自身字体，Shiki 保留语法高亮、文件名、行高亮与 diff 能力。

## 资源与维护

Anthropic 字体按[来源 README](https://github.com/Isilsolme/dsh-anthropic-fonts/blob/70deb78a198ebd3786d772d92a23d41eeb7510c0/README.md)从 `fonts/` 下载，固定版本 `70deb78a198ebd3786d772d92a23d41eeb7510c0`。三份原始 TTF 随站点托管，CSS 只使用本站 URL 与 `font-display: swap`，不使用 `local()` 或运行时字体 CDN；用户本机没有对应字体也会加载本站文件。Noto Sans SC 继续使用现有可变字重 200–900、`unicode-range` WOFF2 分包。

三份 Anthropic 文件都只有直立 Regular 400，`AnthropicMonoVariable.ttf` 实际没有可变轴。500/600 与 italic 允许浏览器合成，字形可能不同于拥有真实字重/斜体的参考来源；中文代码使用 Noto，中文字形不保证等宽。

上游声明 Anthropic 字体为专有字体，仅供个人使用，不受仓库代码 MIT 许可覆盖。作者已确认拥有本站托管对应授权；本仓不因此授予其他用途或再次分发许可。来源与字体声明见 `public/fonts/NOTICE-anthropic.txt`；Noto 的 OFL 保留。

运行 `make fonts-fetch` 更新三份固定版本 Anthropic 字体、Noto 中文分包及配套 CSS。更新器先暂存并校验，Anthropic 使用固定 SHA-256；下载、校验或替换失败时保留或恢复旧文件。调用期间暂停其他字体更新与构建；进程中断或回滚失败时按错误输出中的事务目录人工恢复。命令不是发布入口，改动仍须通过源码 PR。

## 浅色 Markdown token

全站浅色页底 `rgb(252,252,251)`；正文与标题 `rgb(11,11,11)`。暗色保留现有 Kraft 内容色值和 UI 色值，字体、字号与圆角跟随新规则；margin / padding 按下文恢复旧版实测值。其余 UI 强调色与边线沿用现有值。

| 元素            | 字号 / 字重    | 行高    | 补充规则                                                             |
| --------------- | -------------- | ------- | -------------------------------------------------------------------- |
| p、li、普通文本 | 16px / 400     | 24px    | margin / padding 见下文旧版间距                                      |
| h2              | 22px / 600     | 27.5px  | 间距见下文                                                           |
| h3              | 18px / 600     | 23.4px  | 间距见下文                                                           |
| h4              | 16px / 600     | 20.8px  | 间距见下文                                                           |
| strong          | 继承字号 / 600 | 继承    | em 为 italic，del 为删除线                                           |
| 行内 code       | 14.4px / 400   | 14.4px  | `rgb(142,38,38)`；正文色 5% 背景、10% 的 1px 边框                    |
| pre / pre code  | 14px / 400     | 22.75px | 默认字色 `rgb(20,24,31)`；正文色 5% 背景、10% 的 1px 边框；圆角 12px |
| blockquote      | 16px / 400     | 24px    | `rgb(82,81,78)`；左侧 4px 正文色 10% 边线，左内距 17.6px             |
| a               | 继承 / 继承    | 继承    | `rgb(24,79,149)`，下划线                                             |
| th              | 16px / 500     | 24px    | 正文色 5% 背景                                                       |
| td              | 16px / 400     | 24px    | 继承正文色                                                           |
| hr              | —              | —       | 1px 正文色 10% 边线；间距见下文                                      |

未测到的 h1/h5/h6、脚注、details、mark 等字号与行高沿用现有规则；普通文本统一正文衬线栈。文章大标题由阅读 module 单独拥有，沿用原字号。

## 间距局部回退

2026-10-09 作者确认：保留 Anthropic / Noto 字体、现有字号、字重、行高、颜色、边框、圆角与页面布局，只把所有受字体更新影响的 margin / padding 恢复到更新前的实际像素值。关于页也恢复专用留白，首段仍使用当前 16px / 24px，不恢复旧版大字。

基线为下文旧版标签，在默认根字号 16px、1440px 与 390px 视口用浏览器读取 computed style。文章旧正文基准为 18px，说说列表与详情为 17px；CSS 的 `--spacing-body-size` 与随标题/表格变化的 `--spacing-text-size` 仅计算旧间距，不控制实际字号。保留基线的首尾归零、嵌套列表与引用末项规则。

| 元素                                      | 文章旧像素                   | 说说旧像素                   |
| ----------------------------------------- | ---------------------------- | ---------------------------- |
| p、顶层 ul / ol 上下 margin               | 14.04px                      | 13.26px                      |
| h2 上 / 下 margin                         | 56.232px / 17.892px          | 53.108px / 16.898px          |
| h3 上 / 下 margin                         | 36.108px / 11.682px          | 34.102px / 11.033px          |
| h4 上 / 下 margin                         | 27.216px / 9.72px            | 25.704px / 9.18px            |
| h5 / h6 上 / 下 margin                    | 28px / 11.2px                | 同文章                       |
| ul / ol 左 padding；li 左 padding         | 27px；3.6px                  | 25.5px；3.4px                |
| blockquote 上下 margin；上下 / 左 padding | 30.6px；2.7px / 17.6px       | 28.9px；2.55px / 17.6px      |
| blockquote p 上下 margin                  | 6.3px                        | 5.95px                       |
| img 上下 margin                           | 31.5px                       | 29.75px                      |
| Shiki pre 上 / 下 margin                  | 17.028px / 19.35px           | 16.082px / 18.275px          |
| hr / details 上下 margin                  | 24.3px                       | 22.95px                      |
| 块级公式外层上下 margin / padding         | 19.8px / 8px                 | 18.7px / 8px                 |
| table 上下 margin                         | 11.6064px                    | 同文章                       |
| 普通段落行内 code 上 / 左右 / 下 padding  | 1.584px / 6.336px / 1.9008px | 1.496px / 5.984px / 1.7952px |
| 普通段落 mark 上下 / 左右 padding         | 0.9px / 3.24px               | 0.85px / 3.06px              |

标题与表格中的 code / mark 分别按旧父元素字号恢复内距，而实际 code 始终为当前 14.4px。Shiki 代码块内距、表格单元格内距、文件名条留白、details 内距等原先以 rem 计算的规则保留；普通 HTML pre 恢复为无内距，其上下 margin 为文章 24.3px / 说说 22.95px。

旧规则有级联例外：Shiki pre、hr、details 与块级公式作为正文唯一子元素时，上下 margin 仍保留上表的值；普通段落、标题、列表、引用、表格的首项顶距/末项底距归零。嵌套列表 margin 为 0，嵌套引用左 margin 为 8px；引用最后一个子元素底距为 0。恢复的是这些实际结果。

关于页普通 p 顶距 0、底距 22.4px；每个父元素内的首个 p 底距 29.6px（包括引用与 details 内）。ul 左 padding 21.6px，h1 底距 24px；其他标准 Markdown 元素的 margin / padding 为 0。公式只恢复外层留白，KaTeX 内部排版保留。

验收在 `tests/site/fixture/spacing-baseline.ts` 保存独立测得的旧值，浏览器测试同时覆盖桌面/手机、文章/说说列表/说说详情/关于页、标题和表格中的行内码、嵌套结构与首尾例外。恢复 margin / padding 不保证换行和元素总高度与旧版一致；这些仍受当前字体、字号、行高影响。自定义内联 HTML 若另设字体尺寸，不属于此标准上下文基线。

## 回退

仅撤销间距回退时，对本次间距 PR 的合并提交创建 revert PR，即可恢复字体更新后的紧凑间距（源码基线 `c7b67a2fef00041b8d5689253ce15cf24d141d3c`）；仍须通过两项 CI 并重新发布。

改动前基线为 `9b337f80b86bc5432a6dcd9d157eceb4903c6a59`，标签 `typography-before-anthropic-20261009`。该标签包含旧字体资源、CSS、更新器和文档。

完整回退流程见[维护手册](deployment.md#字体与排版回退)。回退源码与生产部署是两步操作；撤销 PR 并重新发布才能让公开站点恢复。生产内容仍由内容仓提供，不随字体回退回滚。
