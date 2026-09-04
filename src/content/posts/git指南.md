---
title: "git指南"
description: "从安装配置讲到工作区、暂存区、本地与远程仓库，以及暂存提交、日志回退和分支操作。"
publishedAt: "2026-01-23T17:57:17+08:00"
tags:
  - Git
draft: false
# 禁止修改
id: 2
---

# Git 零基础学习笔记

## 1. Git 安装与配置
### 安装配置参考文档

- [Git 安装配置详细教程](https://blog.csdn.net/qq_62223405/article/details/154869827?ops_request_misc=elastic_search_misc&request_id=65cb24b096bb603b07cb714b5f6366dd&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~top_click~default-2-154869827-null-null.142^v102^pc_search_result_base3&utm_term=git%E5%AE%89%E8%A3%85%E6%95%99%E7%A8%8B&spm=1018.2226.3001.4187)

## 2. Git 核心理论
### 2.1 Git 四个工作区域

-  工作区（Working Directory）：即本地电脑中可见的文件目录，是日常编写代码、修改文件的区域。工作区的文件状态分为“未跟踪”和“已跟踪”，未跟踪文件是指从未被Git管理过的文件。
-  暂存区（Stage/Index）：位于.git目录下的index文件中，用于临时存储工作区中已修改并准备提交的文件。暂存区相当于“缓冲区”，可将多个修改分批暂存，再一次性提交到本地仓库，便于灵活管理提交内容。
- 本地仓库（Local Repository）：即.git隐藏目录，包含了所有版本的提交记录、分支信息等核心数据，是Git版本控制的核心。提交到本地仓库的文件会形成历史版本，可随时回退到任意版本。
- 远程仓库（Remote Repository）：位于服务器上的仓库（如GitHub、Gitee），用于多人协作共享代码。本地仓库可与远程仓库同步，实现代码推送（push）和拉取（pull），完成协作开发。

>流转关系：工作区修改 → git add 到暂存区 → git commit 到本地仓库 → git push 到远程仓库；反之，远程仓库代码可通过 git pull 拉取到本地仓库，再同步到工作区。


### 2.2 Git 文件的四种状态
- 未跟踪（Untracked）：文件在工作区，但从未执行过git add命令，Git不管理该文件。执行git add后，状态变为“已暂存”。
- 已暂存（Staged）：文件已存入暂存区，等待提交到本地仓库。执行git commit后，状态变为“已提交”；若修改已暂存的文件，会同时存在“已暂存”和“已修改”状态，需重新执行git add更新暂存区。

- 已提交（Committed）：文件已提交到本地仓库，形成历史版本。此时文件在本地仓库中是稳定的，可通过git reset回退版本，或通过git push推送到远程仓库。

- 已修改（Modified）：文件在工作区被修改过，但尚未暂存。执行git add可将其转为“已暂存”状态；执行git checkout -- 文件名可丢弃修改，回到“已提交”或“已暂存”状态。

>可通过git status命令随时查看文件当前状态，明确下一步操作方向。
## 3. Git 基础操作命令
### 3.1 仓库初始化与克隆
| 命令 | 功能描述 | 示例 |
|------|----------|------|
| `git init` | 初始化本地Git仓库 | `git init` → 在当前目录创建.git隐藏目录 |
| `git clone [url]` | 克隆远程仓库到本地 | `git clone https://github.com/username/repo.git` → 克隆远程仓库 |

### 3.2 文件状态与修改查看
| 命令 | 功能描述 | 示例 |
|------|----------|------|
| `git status [文件]` | 查看文件/所有文件的状态 | 1. `git status test.txt` → 查看指定文件状态<br>2. `git status` → 查看所有文件状态 |
| `git diff [文件]` | 查看文件的具体修改内容 | `git diff test.txt` → 查看test.txt的修改内容 |

### 3.3 暂存与提交
| 命令 | 功能描述 | 示例 |
|------|----------|------|
| `git add [文件]` | 添加指定文件到暂存区 | `git add test.txt` → 添加单个文件 |
| `git add .` | 添加所有修改的文件到暂存区 | `git add .` → 批量添加所有文件 |
| `git commit -m "提交信息"` | 提交暂存区内容到本地仓库 | `git commit -m "新增test.txt文件"` → 提交并添加描述 |

### 3.4 版本日志与回退
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

### 3.5 撤销修改与删除文件
| 命令 | 功能描述 | 适用场景 |
|------|----------|----------|
| `git checkout -- [文件]` | 丢弃工作区的修改 | 1. 文件仅在工作区修改，未暂存 → 回到版本库状态<br>2. 文件已暂存后又修改 → 回到暂存后的状态 |
| `git reset HEAD [文件]` | 撤销暂存区的修改（放回工作区） | 文件已添加到暂存区，想撤销暂存 |
| `git rm [文件]` | 删除版本库中的文件 | `git rm test.txt && git commit -m "remove test.txt"` → 删除文件并提交 |

> 撤销修改场景总结：
> - 场景1：仅改乱工作区 → `git checkout -- 文件`
> - 场景2：改乱工作区+已暂存 → 先`git reset HEAD 文件`，再执行场景1
> - 场景3：已提交错误版本 → 用`git reset --hard`回退（未推送到远程时可用）

### 3.6 远程仓库交互
| 命令 | 功能描述 | 示例 |
|------|----------|------|
| `git remote add origin [远程地址]` | 关联远程仓库（origin为默认名称） | `git remote add origin git@github.com:username/repo.git` |
| `git push -u origin main` | 第一次推送main分支到远程（-u绑定关联） | `git push -u origin main` → 推送本地main分支到远程 |
| `git push origin main` | 后续推送本地修改到远程main分支 | `git push origin main` → 日常推送更新 |
| `git remote -v` | 查看已关联的远程仓库信息 | `git remote -v` → 显示远程仓库的fetch/push地址 |
| `git remote rm origin` | 删除已关联的远程仓库 | `git remote rm origin` → 解除和远程仓库的关联 |

## 4. Git 分支操作
### 4.1 分支基础命令
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

### 4.2 分支冲突处理
当不同分支修改同一文件导致合并冲突时：
1. Git会标记冲突文件的冲突位置
2. 手动编辑文件，删除冲突标记并调整代码逻辑
3. 保存后执行`git add [冲突文件]` → `git commit -m "解决分支冲突"` 完成合并

---
参考资料:
- [Git 速查表（Cheat Sheet）](https://liaoxuefeng.com/books/git/conclusion/git-cheat-sheet.pdf)
-  [廖雪峰 Git 教程（零基础入门）](https://liaoxuefeng.com/books/git/introduction/index.html)

