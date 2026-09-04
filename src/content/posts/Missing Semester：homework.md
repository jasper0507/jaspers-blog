---
title: "Missing Semester：homework"
description: "Missing Semester 作业题解：ls -l 权限位、glob、引号和若干命令练习。"
publishedAt: "2026-08-26T09:51:00+08:00"
tags:
  - Linux
draft: false
# 禁止修改
id: 25
---

# homework

## 1. `ls` 的 `-l` 选项（flag）作用是什么？运行 `ls -l /` 并观察输出。每一行最前面的 10 个字符分别代表什么？（提示：`man ls`）

`ls -l` 中的 `-l` 表示 **long format**，作用是以长格式显示文件或目录的信息。

它会显示：文件权限、链接数、所有者、所属组、文件大小、修改时间和文件名。

### 最前面的 10 个字符

例如：

```
drwxr-xr-x
```

可以拆成：

```
d rwx r-x r-x
```

含义如下：

```
第 1 个字符：文件类型
第 2-4 个字符：文件所有者的权限
第 5-7 个字符：所属组的权限
第 8-10 个字符：其他用户的权限
```

### 第 1 个字符常见含义

```
d  目录
-  普通文件
l  符号链接
```

### 后 9 个字符表示权限

后 9 个字符表示权限，分成三组：

```
rwx r-x r-x
```

分别表示：

```
文件所有者    所属组    其他用户
```

### 权限字符含义

```
r  可读
w  可写
x  可执行；对目录来说表示可以进入
-  没有该权限
```

---

## 2. 在命令 `find ~/Downloads -type f -name "*.zip" -mtime +30` 中，`*.zip` 是一个「glob」。什么是 glob？新建一个测试目录并创建一些文件，试试 `ls *.txt`、`ls file?.txt`、`ls {a,b,c}.txt` 等模式。参见 Bash 手册中的 Pattern Matching。

Glob 是 Shell 的文件名匹配模式，用来按规则匹配一批文件名。

在这个命令中：

```bash
find ~/Downloads -type f -name "*.zip" -mtime +30
```

`*.zip` 表示匹配所有以 `.zip` 结尾的文件名。这里加引号是为了防止 Shell 提前展开，让 `find` 自己按 `-name` 的规则匹配文件名。

### 常见模式

```
*        匹配任意长度的任意字符
?        匹配单个任意字符
[abc]    匹配 a、b、c 中任意一个字符
[a-z]    匹配 a 到 z 范围内的一个字符
{a,b,c}  展开为 a、b、c 三种写法
```

### 测试命令

```bash
mkdir glob-test
cd glob-test

touch a.txt b.txt c.txt
touch file1.txt file2.txt fileA.txt file10.txt

ls *.txt
ls file?.txt
ls {a,b,c}.txt
```

### 结果理解

```
ls *.txt        匹配所有 .txt 文件
ls file?.txt    匹配 file 后面只有 1 个字符的 .txt 文件
ls {a,b,c}.txt  等价于 ls a.txt b.txt c.txt
```

---

## 3. `'单引号'`、`"双引号"` 和 `$'ANSI 引号'` 有什么区别？写一条命令，输出一个同时包含字面量 `$`、`!` 和换行符的字符串。参见 Quoting。

`'单引号'`：几乎全部按字面量处理，不展开变量，也不识别 `\n`。

`"双引号"`：保留整体，但仍会展开 `$变量`、`$(命令)` 等内容。

`$'ANSI 引号'`：不做变量展开，但会识别 `\n`、`\t` 等转义字符。

关键命令：

```bash
printf '%s' $'literal $ and !\nnew line\n'
```

输出效果：

```
literal $ and !
new line
```

这里 `$` 和 `!` 是字面量，`\n` 会变成真正的换行。

默认优先用单引号 `'...'`，需要变量展开时用双引号 `"..."`，需要写换行、制表符这类转义字符时用 `$'...'`。

---

## 4. Shell 有三条标准流：stdin（0）、stdout（1）、stderr（2）。运行 `ls /nonexistent /tmp`，把 stdout 和 stderr 分别重定向到两个文件。你将如何把两者都重定向到同一个文件？参见 Redirections。

分别重定向：

```bash
ls /nonexistent /tmp >stdout.log 2>stderr.log
```

这里 `>` 等价于 `1>`，表示正常输出；`2>` 表示错误输出。

都重定向到同一个文件：

```bash
ls /nonexistent /tmp >all.log 2>&1
```

`>all.log` 先把 `stdout` 指向文件，`2>&1` 再让 `stderr` 跟随 `stdout`。顺序不能反。

---

## 5. `$?` 保存上一条命令的退出状态（0 表示成功）。`&&` 仅在前一条成功时执行后一条；`||` 仅在前一条失败时执行后一条。写一个一行命令：仅当 `/tmp/mydir` 不存在时才创建它。参见 Exit Status。

`$?` 保存上一条命令的退出状态：`0` 表示成功，非 `0` 表示失败。

`&&`：前一条成功，才执行后一条。

`||`：前一条失败，才执行后一条。

关键命令：

```bash
[[ -d /tmp/mydir ]] || mkdir /tmp/mydir
```

含义是：如果 `/tmp/mydir` 已经存在，就什么都不做；如果不存在，才执行 `mkdir /tmp/mydir`。

---

## 6. 写一个脚本，接收文件名参数（`$1`），用 `test -f` 或 `[ -f ... ]` 检查该文件是否存在，并根据结果输出不同提示。参见 Bash Conditional Expressions。

脚本内容：

```bash
#!/usr/bin/env bash

file="$1"

if [ -f "$file" ]; then
  echo "文件存在：$file"
else
  echo "文件不存在或不是普通文件：$file"
fi
```

运行方式：

```bash
bash check_file.sh test.txt
```

如果要直接用 `./check_file.sh test.txt` 运行，需要先添加可执行权限：

```bash
chmod +x check_file.sh
```

`chmod` 是 `change mode`，表示修改文件权限；`+x` 表示添加可执行权限。

---

## 7. 在脚本的 `set` 选项（flag）里加入 `-x` 会发生什么？写个简单脚本试试并观察输出。参见 The Set Builtin。

`set -x` 会开启调试追踪模式：每执行一条命令前，Bash 会先把这条命令打印出来。

脚本内容：

```bash
#!/usr/bin/env bash
set -x

name="jasper"
echo "hello $name"

file="test.txt"
[ -f "$file" ] && echo "文件存在" || echo "文件不存在"
```

运行：

```bash
bash debug.sh
```

输出中，前面带 `+` 的行是 Bash 打印的执行过程；不带 `+` 的行才是命令本身的正常输出。

作用：看清脚本执行了哪些命令，以及变量展开后变成了什么。

---

## 8. `xargs` 会把 `stdin` 的每一行转换为命令参数。结合 `find` 和 `xargs`（不要用 `find -exec`），找出目录中所有 `.sh` 文件，并用 `wc -l` 统计每个文件行数。加分项：正确处理文件名中的空格。（提示：`-print0` 和 `-0`）参见 `man xargs`。

关键命令：

```bash
find . -type f -name '*.sh' -print0 | xargs -0 wc -l
```

拆解：

- `find .`：从当前目录开始查找
- `-type f`：只找普通文件
- `-name '*.sh'`：只找 `.sh` 文件
- `wc -l`：统计行数
- `xargs`：把前一个命令的输出变成后一个命令的参数
- `-print0`：`find` 用空字符 `\0` 安全输出文件名
- `-0`：`xargs` 用空字符 `\0` 安全读取文件名

`-print0` 和 `-0` 配套使用，可以正确处理带空格的文件名。

---

## 9. `jq` 是处理 JSON 的强大工具。用 `curl` 获取示例数据 `https://microsoftedge.github.io/Demos/json-dummy-data/64KB.json`，再用 `jq` 提取 `version` 大于 `6` 的人员姓名。（提示：先 `jq .` 看结构；再试 `jq '.[] | select(...) | .name'`）

先看结构：

```bash
curl -s https://microsoftedge.github.io/Demos/json-dummy-data/64KB.json | jq .
```

关键命令：

```bash
curl -s https://microsoftedge.github.io/Demos/json-dummy-data/64KB.json \
  | jq -r '.[] | select(.version > 6) | .name'
```

拆解：

- `curl -s URL`：获取 JSON，关闭进度输出
- `jq .`：格式化查看整个 JSON
- `.[]`：遍历数组里的每一项
- `select(.version > 6)`：筛选 `version` 大于 `6` 的对象
- `.name`：提取 `name` 字段
- `-r`：输出纯文本，去掉字符串双引号
