# 字体与 Markdown 排版

2026-10-09 作者确认：UI 使用 `anthropic-sans`，技术文章大标题与所有 Markdown 普通文本使用 `anthropic-serif`，行内码与代码块使用 `anthropic-mono`。首页主句、列表标题、日期、标签、目录和搜索均属于 UI，保留各自字号与布局。默认界面文字为 16px / 24px。

三套栈的中文均优先本站 Noto Sans SC，后续才回退系统字体。关于页、技术文章与说说使用同一正文样式。KaTeX 使用自身字体，Shiki 保留语法高亮、文件名、行高亮与 diff 能力。

## 资源与维护

Anthropic 字体按[来源 README](https://github.com/Isilsolme/dsh-anthropic-fonts/blob/70deb78a198ebd3786d772d92a23d41eeb7510c0/README.md)从 `fonts/` 下载，固定版本 `70deb78a198ebd3786d772d92a23d41eeb7510c0`。三份原始 TTF 随站点托管，CSS 只使用本站 URL 与 `font-display: swap`，不使用 `local()` 或运行时字体 CDN；用户本机没有对应字体也会加载本站文件。Noto Sans SC 继续使用现有可变字重 200–900、`unicode-range` WOFF2 分包。

三份 Anthropic 文件都只有直立 Regular 400，`AnthropicMonoVariable.ttf` 实际没有可变轴。500/600 与 italic 允许浏览器合成，字形可能不同于拥有真实字重/斜体的参考来源；中文代码使用 Noto，中文字形不保证等宽。

上游声明 Anthropic 字体为专有字体，仅供个人使用，不受仓库代码 MIT 许可覆盖。作者已确认拥有本站托管对应授权；本仓不因此授予其他用途或再次分发许可。来源与字体声明见 `public/fonts/NOTICE-anthropic.txt`；Noto 的 OFL 保留。

运行 `make fonts-fetch` 更新三份固定版本 Anthropic 字体、Noto 中文分包及配套 CSS。更新器先暂存并校验，Anthropic 使用固定 SHA-256；下载、校验或替换失败时保留或恢复旧文件。调用期间暂停其他字体更新与构建；进程中断或回滚失败时按错误输出中的事务目录人工恢复。命令不是发布入口，改动仍须通过源码 PR。

## 浅色 Markdown token

全站浅色页底 `rgb(252,252,251)`；正文与标题 `rgb(11,11,11)`。暗色保留现有 Kraft 内容色值和 UI 色值，字体、字号、间距与圆角跟随新规则。其余 UI 强调色与边线沿用现有值。

| 元素            | 字号 / 字重    | 行高    | 补充规则                                                             |
| --------------- | -------------- | ------- | -------------------------------------------------------------------- |
| p、li、普通文本 | 16px / 400     | 24px    | p 顶距 8px；列表顶距 12px                                            |
| h2              | 22px / 600     | 27.5px  | margin 0                                                             |
| h3              | 18px / 600     | 23.4px  | 顶距 24px                                                            |
| h4              | 16px / 600     | 20.8px  | 顶距 8px                                                             |
| strong          | 继承字号 / 600 | 继承    | em 为 italic，del 为删除线                                           |
| 行内 code       | 14.4px / 400   | 14.4px  | `rgb(142,38,38)`；正文色 5% 背景、10% 的 1px 边框                    |
| pre / pre code  | 14px / 400     | 22.75px | 默认字色 `rgb(20,24,31)`；正文色 5% 背景、10% 的 1px 边框；圆角 12px |
| blockquote      | 16px / 400     | 24px    | `rgb(82,81,78)`；左侧 4px 正文色 10% 边线，左内距 16px               |
| a               | 继承 / 继承    | 继承    | `rgb(24,79,149)`，下划线                                             |
| th              | 16px / 500     | 24px    | 正文色 5% 背景                                                       |
| td              | 16px / 400     | 24px    | 继承正文色                                                           |
| hr              | —              | —       | 1px 正文色 10% 边线，顶距 24px                                       |

未测到的 h1/h5/h6、脚注、details、mark 等尺寸与间距沿用现有规则；普通文本统一正文衬线栈。文章大标题由阅读 module 单独拥有，沿用原字号。

## 回退

改动前基线为 `9b337f80b86bc5432a6dcd9d157eceb4903c6a59`，标签 `typography-before-anthropic-20261009`。该标签包含旧字体资源、CSS、更新器和文档。

完整回退流程见[维护手册](deployment.md#字体与排版回退)。回退源码与生产部署是两步操作；撤销 PR 并重新发布才能让公开站点恢复。生产内容仍由内容仓提供，不随字体回退回滚。
