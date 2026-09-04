---
title: "yazi-QuickStart"
description: "终端文件管理器 Yazi 的快捷键速查：导航、选择、操作、过滤和多标签页。"
publishedAt: "2026-08-11T19:49:00+08:00"
tags:
  - 工具
draft: false
# 禁止修改
id: 20
---

# yazi-QuickStart

## 包装函数

它可以让你在退出 Yazi 时，将当前 Shell 的工作目录切换到 Yazi 最后所在的目录。

```bash
function y() {
	local tmp="$(mktemp -t "yazi-cwd.XXXXXX")" cwd
	command yazi "$@" --cwd-file="$tmp"
	IFS= read -r -d '' cwd < "$tmp"
	[ "$cwd" != "$PWD" ] && [ -d "$cwd" ] && builtin cd -- "$cwd"
	command rm -f -- "$tmp"
}
```

之后用 `y` 代替 `yazi` 启动

## 导航

在文件和目录之间移动时，可以使用方向键 <kbd>←</kbd>、<kbd>↓</kbd>、<kbd>↑</kbd>、<kbd>→</kbd>，也可以使用类似 Vim 的 <kbd>h</kbd>、<kbd>j</kbd>、<kbd>k</kbd>、<kbd>l</kbd>：

| 快捷键       | 替代按键     | 操作                     |
| ------------ | ------------ | ------------------------ |
| <kbd>k</kbd> | <kbd>↑</kbd> | 向上移动光标             |
| <kbd>j</kbd> | <kbd>↓</kbd> | 向下移动光标             |
| <kbd>l</kbd> | <kbd>→</kbd> | 进入光标所在的目录       |
| <kbd>h</kbd> | <kbd>←</kbd> | 离开当前目录并进入父目录 |

更多导航操作如下：

| 快捷键                          | 操作                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| <kbd>K</kbd>                    | 在预览中向上移动 5 个单位                                    |
| <kbd>J</kbd>                    | 在预览中向下移动 5 个单位                                    |
| 连续按俩次<kbd>g</kbd>          | 将光标移动到顶部                                             |
| <kbd>G</kbd>                    | 将光标移动到底部                                             |
| <kbd>z</kbd>                    | 通过 fzf [切换目录](https://yazi-rs.github.io/docs/configuration/keymap/#mgr.cd)，或[定位并显示文件](https://yazi-rs.github.io/docs/configuration/keymap/#mgr.reveal) |
| <kbd>Z</kbd>                    | 通过 zoxide [切换目录](https://yazi-rs.github.io/docs/configuration/keymap/#mgr.cd) |
| <kbd>g</kbd> ⇒ <kbd>Space</kbd> | 通过交互式提示[切换目录](https://yazi-rs.github.io/docs/configuration/keymap/#mgr.cd)，或[定位并显示文件](https://yazi-rs.github.io/docs/configuration/keymap/#mgr.reveal) |

## 选择

选择文件和目录时，可以使用以下操作：

| 快捷键                         | 操作                             |
| ------------------------------ | -------------------------------- |
| <kbd>Space</kbd>               | 切换光标所在文件或目录的选中状态 |
| <kbd>v</kbd>                   | 进入可视模式（选择模式）         |
| <kbd>V</kbd>                   | 进入可视模式（取消选择模式）     |
| <kbd>Ctrl</kbd> + <kbd>a</kbd> | 选择所有文件                     |
| <kbd>Ctrl</kbd> + <kbd>r</kbd> | 反选所有文件                     |
| <kbd>Esc</kbd>                 | 取消选择                         |

## 文件操作

对选中的文件或目录，可以使用以下操作：

| 快捷键                              | 操作                                         |
| ----------------------------------- | -------------------------------------------- |
| <kbd>o</kbd>                        | 打开选中的文件                               |
| <kbd>O</kbd>                        | 以交互方式打开选中的文件                     |
| <kbd>Enter</kbd>                    | 打开选中的文件                               |
| <kbd>Shift</kbd> + <kbd>Enter</kbd> | 以交互方式打开选中的文件（部分终端暂不支持） |
| <kbd>Tab</kbd>                      | 显示文件信息                                 |
| <kbd>y</kbd>                        | 复制选中的文件                               |
| <kbd>x</kbd>                        | 剪切选中的文件                               |
| <kbd>p</kbd>                        | 粘贴已复制或剪切的文件                       |
| <kbd>P</kbd>                        | 粘贴已复制或剪切的文件；如果目标已存在则覆盖 |
| <kbd>Y</kbd> 或 <kbd>X</kbd>        | 取消当前复制或剪切状态                       |
| <kbd>d</kbd>                        | 将选中的文件移入回收站                       |
| <kbd>D</kbd>                        | 永久删除选中的文件                           |
| <kbd>a</kbd>                        | 创建文件；名称以 `/` 结尾时创建目录          |
| <kbd>r</kbd>                        | 重命名选中的文件                             |
| <kbd>.</kbd>                        | 显示或隐藏隐藏文件                           |

更多文件操作如下：

| 快捷键                         | 操作                                     |
| ------------------------------ | ---------------------------------------- |
| <kbd>;</kbd>                   | 运行 Shell 命令                          |
| <kbd>:</kbd>                   | 运行 Shell 命令，并阻塞等待命令执行完成  |
| <kbd>-</kbd>                   | 为已复制的文件创建使用绝对路径的符号链接 |
| <kbd>_</kbd>                   | 为已复制的文件创建使用相对路径的符号链接 |
| <kbd>Ctrl</kbd> + <kbd>-</kbd> | 为已复制的文件创建硬链接                 |

## 复制路径

复制路径时，可以使用以下操作。

> **说明：** <kbd>c</kbd> ⇒ <kbd>d</kbd> 表示先按 <kbd>c</kbd>，再按 <kbd>d</kbd>。

| 快捷键                      | 操作                   |
| --------------------------- | ---------------------- |
| <kbd>c</kbd> ⇒ <kbd>c</kbd> | 复制文件路径           |
| <kbd>c</kbd> ⇒ <kbd>d</kbd> | 复制目录路径           |
| <kbd>c</kbd> ⇒ <kbd>f</kbd> | 复制文件名             |
| <kbd>c</kbd> ⇒ <kbd>n</kbd> | 复制不带扩展名的文件名 |

## 过滤文件

| 快捷键       | 操作     |
| ------------ | -------- |
| <kbd>f</kbd> | 过滤文件 |

## 查找文件

| 快捷键       | 操作               |
| ------------ | ------------------ |
| <kbd>/</kbd> | 查找下一个文件     |
| <kbd>?</kbd> | 查找上一个文件     |
| <kbd>n</kbd> | 跳转到下一个匹配项 |
| <kbd>N</kbd> | 跳转到上一个匹配项 |

## 搜索文件

| 快捷键                         | 操作                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| <kbd>s</kbd>                   | 使用 [fd](https://github.com/sharkdp/fd) 按文件名搜索        |
| <kbd>S</kbd>                   | 使用 [ripgrep](https://github.com/BurntSushi/ripgrep) 按文件内容搜索 |
| <kbd>Ctrl</kbd> + <kbd>s</kbd> | 取消正在进行的搜索                                           |

## 排序

文件和目录可以使用以下操作进行排序。

> **说明：** <kbd>,</kbd> ⇒ <kbd>a</kbd> 表示先按 <kbd>,</kbd>，再按 <kbd>a</kbd>。

| 快捷键                      | 操作                 |
| --------------------------- | -------------------- |
| <kbd>,</kbd> ⇒ <kbd>m</kbd> | 按修改时间排序       |
| <kbd>,</kbd> ⇒ <kbd>M</kbd> | 按修改时间逆序排列   |
| <kbd>,</kbd> ⇒ <kbd>b</kbd> | 按创建时间排序       |
| <kbd>,</kbd> ⇒ <kbd>B</kbd> | 按创建时间逆序排列   |
| <kbd>,</kbd> ⇒ <kbd>e</kbd> | 按文件扩展名排序     |
| <kbd>,</kbd> ⇒ <kbd>E</kbd> | 按文件扩展名逆序排列 |
| <kbd>,</kbd> ⇒ <kbd>a</kbd> | 按字母顺序排序       |
| <kbd>,</kbd> ⇒ <kbd>A</kbd> | 按字母逆序排列       |
| <kbd>,</kbd> ⇒ <kbd>n</kbd> | 按自然顺序排序       |
| <kbd>,</kbd> ⇒ <kbd>N</kbd> | 按自然顺序逆序排列   |
| <kbd>,</kbd> ⇒ <kbd>s</kbd> | 按大小排序           |
| <kbd>,</kbd> ⇒ <kbd>S</kbd> | 按大小逆序排列       |
| <kbd>,</kbd> ⇒ <kbd>r</kbd> | 随机排序             |

## 多标签页

| 快捷键                                        | 操作                               |
| --------------------------------------------- | ---------------------------------- |
| <kbd>t</kbd> ⇒ <kbd>t</kbd>                   | 在当前工作目录中创建新标签页       |
| <kbd>1</kbd>、<kbd>2</kbd>、...、<kbd>9</kbd> | 切换到第 N 个标签页                |
| <kbd>[</kbd>                                  | 切换到上一个标签页                 |
| <kbd>]</kbd>                                  | 切换到下一个标签页                 |
| <kbd>{</kbd>                                  | 将当前标签页与上一个标签页交换位置 |
| <kbd>}</kbd>                                  | 将当前标签页与下一个标签页交换位置 |
| <kbd>Ctrl</kbd> + <kbd>c</kbd>                | 关闭当前标签页                     |

## 配色主题（Flavors）

可以从官方的 [Flavors 仓库](https://github.com/yazi-rs/flavors) 中挑选喜欢的配色方案，也可以[制作自己的 Flavor](https://yazi-rs.github.io/docs/flavors/overview/#cooking)。

---

- [官方文档参考](https://yazi-rs.github.io/docs/installation)
