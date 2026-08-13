---
title: "git新手入门参考"
description: "这是一篇用于新手快速上手git基本操作的文章。"
publishedAt: 2026-01-23T17:57:17+08:00
tags:
  - "工程实践"
  - "版本控制"
  - "教程"
  - "Git"
draft: false
---

## Git 零基础学习笔记
### 目录
1. [Git 安装配置详细教程](#1-git-安装与配置)
2. [前置知识：Git常用Linux命令](#2-前置知识git常用linux命令)
3. [Git 核心理论](#3-git-核心理论)
4. [Git 基础操作命令](#4-git-基础操作命令)
5. [Git 分支操作](#5-git-分支操作)
6. [参考资料](#6-参考资料)

### 1. Git 安装与配置
#### 安装配置参考文档
- [Git 安装配置详细教程](https://blog.csdn.net/qq_62223405/article/details/154869827?ops_request_misc=elastic_search_misc&request_id=65cb24b096bb603b07cb714b5f6366dd&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~top_click~default-2-154869827-null-null.142^v102^pc_search_result_base3&utm_term=git%E5%AE%89%E8%A3%85%E6%95%99%E7%A8%8B&spm=1018.2226.3001.4187)

### 2. 前置知识：Git常用Linux命令
Git操作依赖Linux终端命令，以下是高频使用的命令分类整理：

#### 2.1 目录操作命令
| 命令 | 功能描述 | 基本语法 | 示例 |
|------|----------|----------|------|
| `pwd` | 显示当前工作目录的绝对路径 | `pwd` | `pwd` → 输出：`/home/user/git-learn` |
| `cd` | 切换工作目录 | `cd [目录路径]` | 1. `cd ~` → 回到当前用户主目录<br>2. `cd ..` → 回到上级目录<br>3. `cd /home/user` → 切换到指定绝对路径 |
| `ls` | 列出目录下的文件和子目录 | `ls [选项] [目录]` | 1. `ls` → 简单列出文件<br>2. `ls -l` → 详细列表（权限、大小、时间等）<br>3. `ls -a` → 显示隐藏文件（以`.`开头的文件，如.git） |
| `mkdir` | 创建新目录 | `mkdir [选项] 目录名` | 1. `mkdir my-blog` → 创建单级目录<br>2. `mkdir -p dir1/dir2/dir3` → 递归创建多级目录 |
| `rmdir` | 删除空目录 | `rmdir [选项] 目录名` | `rmdir empty-dir` → 删除空目录（非空目录需用`rm -r`） |

#### 2.2 文件操作命令
| 命令 | 功能描述 | 基本语法 | 示例 |
|------|----------|----------|------|
| `touch` | 创建空文件或更新文件的时间戳 | `touch 文件名` | `touch README.md` → 创建空的README文件 |
| `cat` | 查看文件内容（适合小文件） | `cat [选项] 文件名` | 1. `cat README.md` → 输出文件全部内容<br>2. `cat file1.txt file2.txt > file3.txt` → 合并两个文件到file3 |
| `cp` | 复制文件或目录 | `cp [选项] 源路径 目标路径` | 1. `cp README.md docs/` → 复制文件到docs目录<br>2. `cp -r dir1 dir2` → 递归复制整个目录 |
| `mv` | 移动/重命名文件或目录 | `mv [选项] 源路径 目标路径` | 1. `mv old.txt new.txt` → 重命名文件<br>2. `mv new.txt docs/` → 移动文件到docs目录 |
| `rm` | 删除文件或目录（**谨慎使用**） | `rm [选项] 路径` | 1. `rm test.txt` → 删除单个文件<br>2. `rm -r dir1` → 递归删除目录及内容<br>3. `rm -rf dir1` → 强制删除（忽略提示，慎用） |
| `tail` | 查看文件尾部内容（常用于日志） | `tail [选项] 文件名` | 1. `tail -n 10 README.md` → 查看最后10行<br>2. `tail -f app.log` → 实时监控文件变化（按`Ctrl+C`退出） |

#### 2.3 权限管理命令
Git仓库的文件权限会影响提交和拉取，核心命令如下：
| 命令 | 功能描述 | 基本语法 | 示例 |
|------|----------|----------|------|
| `chmod` | 修改文件/目录的权限 | `chmod [权限值/符号] 路径` | 1. `chmod 755 script.sh` → 所有者读写执行，其他用户读执行<br>2. `chmod +x script.sh` → 给所有用户添加执行权限 |
| `chown` | 修改文件/目录的所有者和所属组 | `chown [选项] 所有者:所属组 路径` | `chown user:user-group my-file.txt` → 修改文件所有者为user，组为user-group |

#### 2.4 查找与搜索命令
在Git仓库中搜索内容/文件时高频使用：
| 命令 | 功能描述 | 基本语法 | 示例 |
|------|----------|----------|------|
| `find` | 按路径/名称/类型查找文件 | `find [搜索路径] [条件]` | 1. `find . -name "*.md"` → 在当前目录下查找所有md文件<br>2. `find /home -type d -name "git*"` → 查找所有以git开头的目录 |
| `grep` | 在文件中搜索指定字符串 | `grep [选项] 关键词 文件名` | 1. `grep "git" README.md` → 在文件中搜索git关键词<br>2. `grep -r "hello" ./` → 递归搜索当前目录下所有文件中的hello |
| `diff` | 对比两个文件的内容差异 | `diff [选项] 文件1 文件2` | `diff old.txt new.txt` → 显示两个文件的差异（和`git diff`原理类似） |

#### 2.5 压缩与解压命令
Git备份/下载资源时常用：
| 命令 | 功能描述 | 基本语法 | 示例 |
|------|----------|----------|------|
| `tar` | 打包/解压文件（最常用） | `tar [选项] 压缩包名 源文件/目录` | 1. `tar -zcvf my-git.tar.gz ./` → 打包并压缩当前目录<br>2. `tar -zxvf my-git.tar.gz` → 解压压缩包到当前目录 |

#### 2.6 Git协作相关命令
用于和远程Git仓库（GitHub/Gitee）交互：
| 命令 | 功能描述 | 基本语法 | 示例 |
|------|----------|----------|------|
| `ssh` | 连接远程服务器（克隆私有仓库时用） | `ssh [用户名]@[服务器地址]` | `ssh git@github.com` → 测试与GitHub的SSH连接 |
| `scp` | 跨机器传输文件 | `scp [选项] 源文件 目标地址` | `scp local-file.txt user@server:/home/user/` → 本地文件传到远程服务器 |

#### 2.7 其他常用命令
| 命令 | 功能描述 | 基本语法 | 示例 |
|------|----------|----------|------|
| `echo` | 输出内容到终端或文件 | `echo [内容]` | 1. `echo "Hello Git"` → 终端输出字符串<br>2. `echo "test" > test.txt` → 写入内容到文件（覆盖原有内容） |
| `man` | 查看命令的官方手册（新手必备） | `man 命令名` | `man git` → 查看git的详细帮助文档<br>`man ls` → 查看ls命令的所有选项 |
| `clear` | 清空终端屏幕 | `clear` | `clear` → 一键清空当前终端内容 |

### 3. Git 核心理论
#### 3.1 Git 四个工作区域
-  工作区（Working Directory）：即本地电脑中可见的文件目录，是日常编写代码、修改文件的区域。工作区的文件状态分为“未跟踪”和“已跟踪”，未跟踪文件是指从未被Git管理过的文件。
-  暂存区（Stage/Index）：位于.git目录下的index文件中，用于临时存储工作区中已修改并准备提交的文件。暂存区相当于“缓冲区”，可将多个修改分批暂存，再一次性提交到本地仓库，便于灵活管理提交内容。
- 本地仓库（Local Repository）：即.git隐藏目录，包含了所有版本的提交记录、分支信息等核心数据，是Git版本控制的核心。提交到本地仓库的文件会形成历史版本，可随时回退到任意版本。
- 远程仓库（Remote Repository）：位于服务器上的仓库（如GitHub、Gitee），用于多人协作共享代码。本地仓库可与远程仓库同步，实现代码推送（push）和拉取（pull），完成协作开发。

>流转关系：工作区修改 → git add 到暂存区 → git commit 到本地仓库 → git push 到远程仓库；反之，远程仓库代码可通过 git pull 拉取到本地仓库，再同步到工作区。


#### 3.2 Git 文件的四种状态
- 未跟踪（Untracked）：文件在工作区，但从未执行过git add命令，Git不管理该文件。执行git add后，状态变为“已暂存”。
- 已暂存（Staged）：文件已存入暂存区，等待提交到本地仓库。执行git commit后，状态变为“已提交”；若修改已暂存的文件，会同时存在“已暂存”和“已修改”状态，需重新执行git add更新暂存区。

- 已提交（Committed）：文件已提交到本地仓库，形成历史版本。此时文件在本地仓库中是稳定的，可通过git reset回退版本，或通过git push推送到远程仓库。

- 已修改（Modified）：文件在工作区被修改过，但尚未暂存。执行git add可将其转为“已暂存”状态；执行git checkout -- 文件名可丢弃修改，回到“已提交”或“已暂存”状态。

>可通过git status命令随时查看文件当前状态，明确下一步操作方向。
### 4. Git 基础操作命令
#### 4.1 仓库初始化与克隆
| 命令 | 功能描述 | 示例 |
|------|----------|------|
| `git init` | 初始化本地Git仓库 | `git init` → 在当前目录创建.git隐藏目录 |
| `git clone [url]` | 克隆远程仓库到本地 | `git clone https://github.com/username/repo.git` → 克隆远程仓库 |

#### 4.2 文件状态与修改查看
| 命令 | 功能描述 | 示例 |
|------|----------|------|
| `git status [文件]` | 查看文件/所有文件的状态 | 1. `git status test.txt` → 查看指定文件状态<br>2. `git status` → 查看所有文件状态 |
| `git diff [文件]` | 查看文件的具体修改内容 | `git diff test.txt` → 查看test.txt的修改内容 |

#### 4.3 暂存与提交
| 命令 | 功能描述 | 示例 |
|------|----------|------|
| `git add [文件]` | 添加指定文件到暂存区 | `git add test.txt` → 添加单个文件 |
| `git add .` | 添加所有修改的文件到暂存区 | `git add .` → 批量添加所有文件 |
| `git commit -m "提交信息"` | 提交暂存区内容到本地仓库 | `git commit -m "新增test.txt文件"` → 提交并添加描述 |

#### 4.4 版本日志与回退
| 命令 | 功能描述 | 示例 |
|------|----------|------|
| `git log` | 显示从近到远的提交日志（完整信息） | `git log` → 查看所有提交记录 |
| `git log --pretty=oneline` | 精简显示提交日志（仅版本号+描述） | `git log --pretty=oneline` → 简化日志输出 |
| `git reflog` | 显示所有操作的命令日志（含回退记录） | `git reflog` → 查看所有Git操作记录 |
| `git reset --hard HEAD^` | 回退到上一个版本（已提交状态） | `git reset --hard HEAD^` → 彻底回退到上个版本 |
| `git reset --soft HEAD^` | 回退到上一个版本（未提交状态） | `git reset --soft HEAD^` → 保留修改，回到未提交状态 |
| `git reset --mixed HEAD^` | 回退到上一个版本（已暂存未提交） | `git reset --mixed HEAD^` → 回到暂存后未提交状态 |
| `git reset --hard [版本号]` | 回退到指定版本 | `git reset --hard 1094a` → 回退到版本号为1094a的版本 |

> 备注：`HEAD`表示当前版本，`HEAD^`=上一版本，`HEAD~100`=往上100个版本

#### 4.5 撤销修改与删除文件
| 命令 | 功能描述 | 适用场景 |
|------|----------|----------|
| `git checkout -- [文件]` | 丢弃工作区的修改 | 1. 文件仅在工作区修改，未暂存 → 回到版本库状态<br>2. 文件已暂存后又修改 → 回到暂存后的状态 |
| `git reset HEAD [文件]` | 撤销暂存区的修改（放回工作区） | 文件已添加到暂存区，想撤销暂存 |
| `git rm [文件]` | 删除版本库中的文件 | `git rm test.txt && git commit -m "remove test.txt"` → 删除文件并提交 |

> 撤销修改场景总结：
> - 场景1：仅改乱工作区 → `git checkout -- 文件`
> - 场景2：改乱工作区+已暂存 → 先`git reset HEAD 文件`，再执行场景1
> - 场景3：已提交错误版本 → 用`git reset --hard`回退（未推送到远程时可用）

#### 4.6 远程仓库交互
| 命令 | 功能描述 | 示例 |
|------|----------|------|
| `git remote add origin [远程地址]` | 关联远程仓库（origin为默认名称） | `git remote add origin git@github.com:username/repo.git` |
| `git push -u origin main` | 第一次推送main分支到远程（-u绑定关联） | `git push -u origin main` → 推送本地main分支到远程 |
| `git push origin main` | 后续推送本地修改到远程main分支 | `git push origin main` → 日常推送更新 |
| `git remote -v` | 查看已关联的远程仓库信息 | `git remote -v` → 显示远程仓库的fetch/push地址 |
| `git remote rm origin` | 删除已关联的远程仓库 | `git remote rm origin` → 解除和远程仓库的关联 |

### 5. Git 分支操作
#### 5.1 分支基础命令
| 命令 | 功能描述 | 示例 |
|------|----------|--------------------------------------|
| `git branch` | 查看所有本地分支（*标记当前分支） | `git branch` → 列出所有分支 |
| `git branch [分支名]` | 创建新分支 | `git branch test` → 创建test分支 |
| `git checkout [分支名]` | 切换分支（旧语法） | `git checkout test` → 切换到test分支 |
| `git switch [分支名]` | 切换分支（新语法，推荐） | `git switch test` → 切换到test分支 |
| `git checkout -b [分支名]` | 创建+切换分支（旧语法） | `git checkout -b test` → 创建并切换到test分支 |
| `git switch -c [分支名]` | 创建+切换分支（新语法，推荐） | `git switch -c test` → 创建并切换到test分支 |
| `git merge [分支名]` | 合并指定分支到当前分支 | `git merge test` → 把test分支合并到当前分支 |
| `git branch -d [分支名]` | 删除本地分支（需先切换到其他分支） | `git branch -d test` → 删除test分支 |
| `git log --graph` | 查看分支合并的图形化日志 | `git log --graph` → 可视化分支合并历史 |

#### 5.2 分支冲突处理
当不同分支修改同一文件导致合并冲突时：
1. Git会标记冲突文件的冲突位置
2. 手动编辑文件，删除冲突标记并调整代码逻辑
3. 保存后执行`git add [冲突文件]` → `git commit -m "解决分支冲突"` 完成合并

### 6. 参考资料
1. [Git 速查表（Cheat Sheet）](https://liaoxuefeng.com/books/git/conclusion/git-cheat-sheet.pdf)
2. [廖雪峰 Git 教程（零基础入门）](https://liaoxuefeng.com/books/git/introduction/index.html)

---
