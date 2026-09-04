---
title: "Missing Semester：Shell入门"
description: "Missing Semester 的 Shell 速查：命令表、引号规则、路径跳转、glob 和查看文件。"
publishedAt: "2026-08-26T09:28:00+08:00"
tags:
  - Linux
draft: false
# 禁止修改
id: 23
---

# Shell入门

> Shell 用来运行命令、组合命令、写简单脚本。速查时先看命令表和符号表。
> 

## 命令速查总表

| 命令 | 最常用写法 | 用途 |
| --- | --- | --- |
| `tldr` | `tldr -L zh tar` | 查命令示例 |
| `pwd` | `pwd` | 查看当前目录 |
| `cd` | `cd dir` / `cd ..` / `cd ~` | 切换目录 |
| `echo` | `echo "$PATH"` | 打印内容或变量 |
| `curl` | `curl -sL URL` | 请求网址 |
| `which` | `which echo` | 查看命令位置 |
| `eza` | `eza --tree -L2` | 查看目录结构 |
| `fzf` | `find . -type f | fzf` | 交互式模糊选择 |
| `cat` | `cat file` | 查看完整文件 |
| `head` | `head file` | 查看文件开头 |
| `tail` | `tail file` | 查看文件结尾 |
| `sort` | `sort file` | 按行排序 |
| `uniq` | 先 `sort` 再 `uniq` | 去除重复行 |
| `wc` | `wc -l file` | 统计行数 |
| `xargs` | `find ... -print0 | xargs -0 命令` | 把输入变成参数 |
| `grep` | `grep -r "TODO" .` | 搜索文本 |
| `sed` | `sed -i 's/a/b/g' file` | 替换文本 |
| `awk` | `awk -F ':' '{print $1}' file` | 按列处理文本 |
| `jq` | `jq -r '.[] | .name'` | 处理 JSON |
| `tee` | 配合管道保存输出 | 保存输出并继续传递 |
| `chmod` | `chmod +x script.sh` | 修改文件权限 |
| `kill` | `kill "$PID"` | 停止进程 |

## 常用符号速查

| 符号 | 含义 |
| --- | --- |
| `$var` | 取变量的值 |
| `$()` | 执行命令，并把输出替换到当前位置 |
| `$!` | 上一个后台任务的 PID |
| `$?` | 上一条命令的退出状态 |
| `&&` | 前一条成功才执行后一条 |
| `$@` | 脚本接收到的所有命令行参数 |
| `$#` | 脚本接收到的参数个数 |
| `||` | 前一条失败才执行后一条 |
| `&` | 后台运行 |
| `|` | 把前一个命令的输出交给后一个命令 |
| `>` | 覆盖写入文件 |
| `>>` | 追加写入文件 |
| `<` | 从文件读取输入 |
| `2>` | 重定向错误输出 |
| `2>&1` | 让错误输出跟随正常输出 |
| `[[ ]]` | 条件判断 |
| `(( ))` | 整数算术运算 |
| `'...'` | 字面量字符串，不展开变量 |
| `"..."` | 保留整体，但仍展开变量和命令 |
| `$'...'` | 识别 `\n`、`\t` 等转义字符 |

---

## 基础概念

### 引号

`'单引号'` 最严格，里面几乎全都按字面量处理。`$` 不会变量展开，`!` 不会历史展开，`\n` 也只是普通的两个字符。

```bash
echo '$HOME\n!'
```

输出的是字面量：

```
$HOME\n!
```

`"双引号"` 会保留整体，但仍允许部分展开。空格不会拆词，但 `$变量`、`$(命令)`、反引号仍会生效。交互式 Bash 里，`!` 还可能触发历史展开。

```bash
echo "$HOME"
```

会输出 `HOME` 变量的值。

`$'ANSI 引号'` 像单引号一样不做变量展开，但会识别转义字符。最常用的是写换行、制表符等。

```bash
echo $'hello\nworld'
```

会输出两行。

### 命令是怎么执行的

Shell 会按空格、Tab 等空白字符拆分命令。第一个单词是要执行的程序，后面的内容都是参数。

```bash
echo hello world
```

这里 `echo` 是程序，`hello` 和 `world` 是参数。`echo` 的作用是把收到的参数原样打印出来。

```bash
echo hello          # 打印内容
echo "$PATH"        # 打印 PATH 变量
which echo          # 查看 echo 对应的可执行文件位置
tldr -L zh tar      # 查看 tar 的常见用法示例
```

- `tldr`：快速查看命令的常见用法，全称是 `Too Long; Didn't Read`
- `$变量名`：取出变量的值，例如 `$PATH`
- `PATH`：保存一组目录，Shell 会从这些目录里寻找命令
- 命令提示符里的 `$`：通常表示当前不是 root 用户

### 路径与跳转

```bash
pwd                 # 查看当前所在目录
cd dir              # 进入目录
cd ..               # 回到上一级目录
cd ~                # 回到 home 目录
z web_app           # 用 zoxide 快速跳转到匹配目录
```

- `pwd`：`print working directory`，打印当前工作目录
- `~`：当前用户的 home 目录，Linux 上通常是 `/home/用户名`
- `zoxide`：先正常 `cd` 进过一些常用目录，之后可以用 `z 关键词` 快速跳转

---

## 文件与目录

### 查看目录：eza

`ls` 的名字来自 `list`，用于列出文件。`eza` 可以看作更现代的 `ls`。

```bash
eza                 # 查看当前目录文件
eza -l              # 查看权限、大小、修改时间等详细信息
eza -la             # 显示隐藏文件
eza --tree          # 树状显示目录结构
eza --tree -L2      # 只显示两层目录
eza -la --git       # 在 Git 项目里显示文件状态
```

| 命令 | 作用 |
| --- | --- |
| `eza` | 看当前目录 |
| `eza -l` | 看详细信息 |
| `eza -la` | 看详细信息和隐藏文件 |
| `eza --tree -L2` | 看两层项目结构 |
| `eza -la --git` | 看 Git 文件状态 |

### 交互式选择：fzf

`fzf` 是命令行里的模糊查找器。前面的命令负责列出候选项，`fzf` 负责交互式搜索和选择。

```bash
ls | fzf                         # 从当前目录文件中选择
find . -type f | fzf             # 从当前目录所有文件中选择
nano "$(find . -type f | fzf)"    # 选择文件并用 nano 打开
cat ~/.bash_history | fzf        # 搜索历史命令
```

常用快捷键：

```
Ctrl + R    搜索历史命令
Ctrl + T    选择文件/目录并插入到当前命令行
Alt  + C    选择目录并 cd 进去
```

核心记法：`命令输出 | fzf`，把一堆文本行变成可搜索、可选择的列表。

### Glob 文件名匹配

Glob 是 Shell 的文件名匹配模式，用来按规则匹配一批文件名。

```
*        匹配任意长度的任意字符
?        匹配单个任意字符
[abc]    匹配 a、b、c 中任意一个字符
[a-z]    匹配 a 到 z 范围内的一个字符
{a,b,c}  展开为 a、b、c 三种写法
```

### 查看文件内容

```bash
cat file            # 打印整个文件
head file           # 查看文件前几行
tail file           # 查看文件后几行
sort file           # 按行排序
uniq file           # 去除连续重复行
```

`uniq` 只会去除连续重复行。如果要去掉所有重复行，通常先 `sort` 再 `uniq`。

```bash
sort file | uniq
```

---

## 文本处理

### 搜索文本：grep

`grep` 用来搜索文本内容。

```bash
grep "error" app.log
```

- `grep`：搜索文本内容的命令
- `"error"`：要查找的内容
- `app.log`：被搜索的文件

递归搜索目录：

```bash
grep -r "TODO" .
```

`.` 表示当前目录，`-r` 表示递归搜索目录里的文件。

### 替换文本：sed

`sed` 常用于替换文本。

```bash
sed -i 's/旧内容/新内容/g' file
```

| 部分 | 含义 |
| --- | --- |
| `-i` | 直接修改原文件 |
| `s` | substitute，替换 |
| `旧内容` | 要被替换的内容 |
| `新内容` | 替换成什么 |
| `g` | global，替换一行里的所有匹配项 |

不加 `g` 时，每一行只替换第一个匹配项。

```bash
sed -i 's/localhost/127.0.0.1/g' config.yaml
```

### 按列处理：awk

`awk` 常用于按列处理文本。

```bash
awk -F ':' '{print $1}' /etc/passwd
```

| 部分 | 含义 |
| --- | --- |
| `-F ':'` | 用 `:` 作为分隔符 |
| `{print $1}` | 打印第一列 |
| `$1` | 第一列 |
| `$2` | 第二列 |

通用格式：

```bash
awk -F 分隔符 '{print $第几列}' 文件
```

### JSON 处理：jq

`jq` 用来在命令行里查看、提取、筛选 JSON。

```bash
curl -s URL | jq .
curl -s URL | jq -r '.[] | select(.version > 6) | .name'
```

常用记法：

```
.                         当前整个 JSON
.name                     取 name 字段
.user.name                取嵌套字段
.[]                       遍历数组
.[0]                      取数组第 1 项
.[] | .name               遍历数组并取 name
select(.version > 6)      筛选 version 大于 6 的对象
-r                        输出纯文本，去掉字符串双引号
length                    统计长度
{name: .name}             重新组装对象
```

常用流程：先 `jq .` 看结构，再用 `.字段`、`.[]`、`select(...)` 提取需要的内容。

---

## 管道与重定向

管道符会把前一个命令的输出交给后一个命令作为输入。

```bash
cat app.log | sort | uniq
go test ./... | tee test.log | grep "FAIL"
```

### xargs：把输入变成参数

`xargs` 会把标准输入里的内容，转换成后面命令的参数。常和 `find` 一起用。

```bash
find . -type f -name '*.sh' -print0 | xargs -0 wc -l
```

这条命令会找出当前目录下所有 `.sh` 文件，并用 `wc -l` 统计每个文件行数。

- `wc -l`：统计行数
- `xargs`：把前一个命令的输出变成后一个命令的参数
- `-print0`：`find` 用空字符 `\0` 安全输出文件名
- `-0`：`xargs` 用空字符 `\0` 安全读取文件名

固定记法：

```
-print0  find 安全输出
-0       xargs 安全接收
```

这样可以正确处理带空格的文件名。

- 为什么管道可以这样连接？
  
    很多命令在没有指定输入文件时，会从标准输入读取数据；命令默认会把结果写到标准输出。管道符就是把前一个命令的标准输出接到后一个命令的标准输入。
    

重定向用来改变输入输出位置。

```bash
cmd > file          # 覆盖写入文件，等价于 1> file
cmd >> file         # 追加写入文件
cmd < file          # 从文件读取输入
cmd 2> file         # 把错误输出写入文件
cmd > all.log 2>&1  # 把正常输出和错误输出都写入同一个文件
```

Shell 有三条标准流：`stdin` 是输入，编号是 `0`；`stdout` 是正常输出，编号是 `1`；`stderr` 是错误输出，编号是 `2`。

```bash
ls /nonexistent /tmp >stdout.log 2>stderr.log
```

这里 `>stdout.log` 等价于 `1>stdout.log`，把正常输出写进 `stdout.log`；`2>stderr.log` 把错误输出写进 `stderr.log`。

```bash
ls /nonexistent /tmp >all.log 2>&1
```

这条命令会先把 `stdout` 指向 `all.log`，再用 `2>&1` 让 `stderr` 指向 `stdout` 当前的位置。顺序不能反过来。

`tee` 用来在管道中保留完整输出，同时继续传给后面的命令。

```bash
cmd | tee output.log
cmd | tee output.log | grep "ERROR"
```

- 第一条：终端显示输出，同时保存到 `output.log`
- 第二条：完整日志保存到 `output.log`，终端只显示包含 `ERROR` 的行

---

## 脚本与后台任务

### Shell 脚本模板

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "start"
```

- `#!/usr/bin/env bash`：表示这个脚本用 bash 执行
- `set -euo pipefail`：新脚本建议默认加上，让错误更早暴露

| 写法 | 含义 |
| --- | --- |
| `-e` | 命令失败就退出脚本 |
| `-u` | 使用未定义变量时报错 |
| `pipefail` | 管道中任意命令失败，整个管道都算失败 |
| `-x` | 打印执行过程，用于调试脚本 |

### 调试脚本：set -x

在脚本里加 `set -x`，Bash 会进入调试追踪模式：每执行一条命令前，先把这条命令打印出来。

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

输出中，前面带 `+` 的行是 Bash 打印的“即将执行的命令”；不带 `+` 的行才是命令本身的正常输出。

`set -x` 常用于查看脚本到底执行了哪些命令，以及变量展开后变成了什么。

### 执行脚本：chmod +x

`chmod +x check_file.sh` 可以拆成三部分：

```bash
chmod +x check_file.sh
```

- `chmod`：`change mode`，修改文件权限
- `+`：添加
- `x`：`execute`，可执行权限

所以 `+x` 的意思是添加可执行权限。加上后，脚本可以这样运行：

```bash
./check_file.sh
```

临时测试脚本时，也可以直接用：

```bash
bash check_file.sh
```

### 后台任务

```bash
command &
```

`&` 表示把命令放到后台运行，不阻塞后面的命令。

```bash
stress --cpu 8 &
STRESS_PID=$!

kill "$STRESS_PID"
```

- `$!`：上一个后台任务的 PID
- `kill "$STRESS_PID"`：停止这个后台任务

---

## 判断与循环

### 退出状态与命令连接

Shell 里的每条命令执行完，都会留下一个退出状态。`$?` 保存上一条命令的结果，`0` 表示成功，非 `0` 表示失败。

```bash
ls /tmp
echo $?

ls /not-exist
echo $?
```

`&&` 表示前一条成功，才执行后一条。

```bash
mkdir test && cd test
```

`||` 表示前一条失败，才执行后一条。

```bash
ls /not-exist || echo "失败了"
```

常见用法：目录不存在时才创建。

```bash
[[ -d /tmp/mydir ]] || mkdir /tmp/mydir
```

### 条件判断

`if command; then ... fi` 判断的是命令是否成功。命令成功，就执行 `then` 后面的内容；失败，就跳过或进入 `else`。

```bash
if [[ -f config.yaml ]]; then
  echo "配置文件存在"
else
  echo "配置文件不存在"
fi
```

`test` 可以判断文件、目录、字符串等条件。`[` 是 `test` 的简写，Bash 里更推荐用 `[[ ]]`，它是更安全的内置判断语法。

```bash
[[ -f file ]]              # 文件存在且是普通文件
[[ -d dir ]]               # 目录存在
[[ "$a" = "$b" ]]          # 字符串相等
[[ -z "$var" ]]            # 变量为空
[[ -n "$var" ]]            # 变量不为空
```

| 写法 | 含义 |
| --- | --- |
| `[[ -f file ]]` | 文件存在且是普通文件 |
| `[[ -d dir ]]` | 目录存在 |
| `[[ "$a" = "$b" ]]` | 字符串相等 |
| `[[ -z "$var" ]]` | 变量为空 |
| `[[ -n "$var" ]]` | 变量不为空 |

### 循环

`while command; do ... done` 和 `if` 类似，只要命令成功，就不断重复执行循环体。

```bash
while [[ -f running.lock ]]; do
  echo "running"
  sleep 1
done
```

普通循环：

```bash
for i in $(seq 1 10); do
  echo "$i"
done
```

`$()` 表示先执行里面的命令，再把输出替换到当前位置。这里会先执行 `seq 1 10`，得到 1 到 10，然后交给 `for` 循环。

C 风格数字循环：

```bash
for ((i = 0; i < 10; i++)); do
  echo "$i"
done
```

| 部分 | 含义 |
| --- | --- |
| `i = 0` | 初始值 |
| `i < 10` | 循环条件 |
| `i++` | 每轮结束后加 1 |

### 整数运算：(( ))

`(( ))` 是 Bash 的整数算术语法，只适合整数运算，不用于字符串判断。

```bash
((i++))            # i = i + 1
((count += 1))     # count = count + 1
```

数字判断：

```bash
if ((num > 0)); then
  echo "num 是正数"
fi
```

字符串判断不要用 `(( ))`，要用 `[[ ]]`。

```bash
if [[ "$env" = "dev" ]]; then
  echo "开发环境"
fi
```
