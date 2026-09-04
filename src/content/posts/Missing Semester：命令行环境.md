---
title: "Missing Semester：命令行环境"
description: "整理环境变量、作业与信号、长期任务清理，以及 SSH 登录远程机器。"
publishedAt: "2026-08-26T09:30:00+08:00"
tags:
  - Linux
draft: false
# 禁止修改
id: 24
---

# 命令行环境

## Linux Shell：后端开发必备

### 1. 命令与环境变量

**清空目录**

```bash
find /path/to/dir -mindepth 1 -delete
```

执行前检查：

```bash
find /path/to/dir -mindepth 1
```

**命令替换与进程替换**

```bash
$(command)   # 把命令输出替换成文本
<(command)   # 把命令输出伪装成文件
```

示例：

```bash
today=$(date +%F)
diff <(ls src) <(ls docs)
```

**环境变量**

```bash
NAME=value             # 当前 Shell 变量
export NAME=value      # 子进程也能继承
NAME=value command     # 仅本次命令有效
unset NAME             # 删除变量
printenv               # 查看环境变量
```

示例：

```bash
TZ=Asia/Tokyo date
```

只让本次 `date` 使用东京时区，不修改当前 Shell。

### 2. 进程、作业与信号

**进程和作业**

- 进程：操作系统概念，用 PID 标识。
- 作业：Shell 管理的一条命令或一组管道，用 `%1`、`%2` 标识。
- 一个作业可能包含多个进程。

```bash
ps aux          # 查看进程
pgrep nginx     # 查 PID
jobs            # 查看当前 Shell 作业
```

**前后台控制**

```bash
command &       # 后台启动
Ctrl-Z          # 暂停前台作业
bg %1           # 后台继续
fg %1           # 调回前台
echo "$!"       # 最近后台进程 PID
```

后台运行并保存日志：

```bash
python app.py > app.log 2>&1 &
```

**常用信号**

```bash
Ctrl-C       SIGINT   中断前台程序
Ctrl-Z       SIGTSTP  暂停程序
kill PID     SIGTERM  请求正常退出
kill -9 PID  SIGKILL  强制终止
```

应先用：

```bash
kill PID
```

无效时再用：

```bash
kill -9 PID
```

`SIGKILL` 无法被捕获，程序不能清理资源；只杀父进程时，子进程可能继续运行，成为孤儿进程。

查看信号：

```bash
kill -l
man signal
```

### 3. 长期任务与脚本清理

**`nohup`**

适合无需交互、关闭终端后继续运行的任务：

```bash
nohup python app.py > app.log 2>&1 &
```

查看日志：

```bash
tail -f app.log
```

**`tmux`**

适合长期任务和 SSH 场景，可重新进入原终端：

```bash
tmux new -s NAME
tmux ls
tmux attach -t NAME
```

离开会话：

```bash
Ctrl-B，然后按 D
```

选择原则：

```txt
只需后台运行：nohup
需要重新进入终端：tmux
正式部署：systemd、Docker、Kubernetes
```

**`trap`**

用于脚本退出时清理资源：

```bash
#!/usr/bin/env bash

cleanup() {
    rm -f /tmp/mytemp.*
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
```

`SIGINT` 或 `SIGTERM` 触发退出，随后由 `EXIT` 执行清理；`SIGKILL` 无法触发 `trap`。

## 远程机器

生成一对密钥，可以运行 [`ssh-keygen`](https://www.man7.org/linux/man-pages/man1/ssh-keygen.1.html)。

```
ssh-keygen -a 100 -t ed25519 -f ~/.ssh/id_ed25519
```

服务器端，`ssh` 查看 `.ssh/authorized_keys` 来决定允许哪些客户端登录。要把公钥复制过去：

```bash
cat .ssh/id_ed25519.pub | ssh alice@remote 'cat >> ~/.ssh/authorized_keys'

# 或者更简单一点（如果系统提供了 ssh-copy-id）

ssh-copy-id -i .ssh/id_ed25519 alice@remote
```

本地和服务器之间传输文件

```bash
scp：直接复制文件

scp path/to/local_file remote_host:path/to/remote_file
冒号 : 很关键，它表示后面是远程路径

复制整个目录需要 -r，即 recursive（递归）：
scp -r ./my-project aliyun-jasper0507:/home/jasper0507/

scp 的特点是简单直接，但重复上传目录时，往往会重新传输全部内容。
```

```bash
rsync：只同步发生变化的内容

rsync -av --partial ./large-file aliyun-jasper0507:/home/jasper0507/

rsync 会比较本地和远程文件，通常只传输新增或变化的部分，而不会每次重传整个项目。

参数：
-a    archive，递归同步，并尽量保留权限、时间、符号链接等信息
-v    verbose，显示同步过程
--partial 表示传输中断后保留未完成的临时数据，下一次可以减少重复传输。
```

临时传一两个小文件：scp
反复同步项目或大量文件：rsync

需要注意目录后的 `/`：

```
rsync-av ./my-project/ server:~/app/
```

表示同步 `my-project` **里面的内容**。

```
rsync-av ./my-project server:~/app/
```

表示把 `my-project` **这个目录本身**复制到 `app` 下。
