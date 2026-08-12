---
title: "新手安装 Docker 教程（Windows11 + WSL2）"
description: "本文包含WSL2、Ubuntu、Docker Desktop的安装步骤，以及安装过程中真实遇到的报错与解决方案。新手只需一步一步跟着做即可。"
publishedAt: 2026-03-08T22:45:34+08:00
tags:
  - "工程实践"
  - "容器与环境"
  - "教程"
  - "Docker"
  - "WSL"
  - "Linux"
draft: false
---
## 一、Docker 安装整体流程

Windows 上安装 Docker 推荐架构：

```

Windows
└─ WSL2
└─ Ubuntu
└─ Docker Engine

```

完整流程：

````

开启 WSL
↓
开启 VirtualMachinePlatform
↓
安装 WSL Kernel
↓
安装 Ubuntu
↓
安装 Docker Desktop
↓
运行 hello-world 测试
````

---

## 二、开启 WSL 功能

以 **管理员身份打开 PowerShell**。

运行：

````powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
````

### 检查是否成功

运行：

````powershell
dism.exe /online /get-featureinfo /featurename:Microsoft-Windows-Subsystem-Linux
````

如果看到：

````
状态 : 已启用
````

说明成功。

### 我遇到的问题

运行：

````powershell
wsl -l -v
````

系统提示：

````
适用于 Linux 的 Windows 子系统没有已安装的分发
````

这是 **正常现象**，因为还没有安装 Linux 发行版。

---

## 三、开启 VirtualMachinePlatform

运行：

````powershell
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
````

### 检查是否成功

运行：

````powershell
dism.exe /online /get-featureinfo /featurename:VirtualMachinePlatform
````

如果输出：

````
状态 : 已启用
````

说明成功。

---

## 四、设置 WSL2

运行：

````powershell
wsl --set-default-version 2
````

成功输出：

````
操作成功完成
````

### 我遇到的问题

第一次执行时出现错误：

````
请启用虚拟机平台 Windows 功能并确保在 BIOS 中启用虚拟化
````

原因：

````
WSL2 Kernel 未安装
````

### 解决方法

运行：

````powershell
wsl --update
````

安装 WSL Kernel。

然后重新运行：

````powershell
wsl --set-default-version 2
````

即可成功。

---

## 五、安装 Ubuntu

运行：

````powershell
wsl --install -d Ubuntu-22.04
````

系统会自动下载 Ubuntu。

### 我遇到的问题

下载进度长时间不动：

````
Downloading...
0%
````

原因：

````
PowerShell 不会实时刷新下载进度
````

解决方法：

````
等待几分钟即可
````

或者直接在 **Microsoft Store** 安装 Ubuntu。

---

## 六、初始化 Ubuntu

第一次启动 Ubuntu 会提示：

````
Enter new UNIX username:
````

输入用户名，例如：

````
jasper0507
````

然后输入密码。

注意：

````
Linux 输入密码不会显示字符
````

成功后终端变成：

````
jasper0507@LAPTOP:~$
````

---

## 七、检查 WSL

运行：

````powershell
wsl -l -v
````

输出：

````
NAME            STATE           VERSION
Ubuntu-22.04    Running         2
````

说明 WSL 正常。

### 我遇到的问题

系统出现两个 Ubuntu：

````
Ubuntu
Ubuntu-22.04
````

解决方法：

````powershell
wsl --unregister Ubuntu
````

保留一个即可。

---

## 八、安装 Docker Desktop

下载：

````
https://www.docker.com/products/docker-desktop/
````

安装时勾选：

````
Use WSL 2 instead of Hyper-V
````

安装完成后 **重启电脑**。

---

## 九、测试 Docker

运行：

````powershell
docker --version
````

输出：

````
Docker version 29.x
````

然后运行：

````powershell
docker run hello-world
````

如果输出：

````
Hello from Docker!
````

说明 Docker 安装成功。

### 我遇到的问题

第一次运行报错：

````
failed to connect to the docker API
````

原因：

````
Docker Desktop 没启动
````

解决方法：

打开：

````
Docker Desktop
````

等待 Docker Engine 启动。

---

## 十、Docker 镜像加速配置

打开：

````
Docker Desktop → Settings → Docker Engine
````

修改配置：

````json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "registry-mirrors": [
    "https://dockerproxy.com",
    "https://mirror.ccs.tencentyun.com"
  ]
}
````

### 我遇到的问题

JSON 报错：

````
Unexpected non-whitespace character after JSON
````

原因：

````
写了两个 JSON 对象
````

解决方法：

把 `registry-mirrors` 写入同一个 JSON 对象。

---

## 十一、Docker 常用命令

查看镜像：

````bash
docker images
````

查看容器：

````bash
docker ps
````

运行 Ubuntu 容器：

````bash
docker run -it ubuntu bash
````

退出容器：

````bash
exit
````

---

## 十二、总结

Docker 安装流程：

````
开启 WSL
↓
开启 VirtualMachinePlatform
↓
安装 WSL Kernel
↓
安装 Ubuntu
↓
安装 Docker Desktop
↓
运行 hello-world
````

完成后的系统结构：

````
Windows
 └─ WSL2
      └─ Ubuntu
           └─ Docker Engine
````

---

## 十三、为什么后端工程师经常使用 Docker

Docker 主要解决三个问题：

### 1 环境一致

````
开发环境 = 测试环境 = 生产环境
````

#### 2 依赖隔离

例如：

````
MySQL
Redis
Kafka
````

每个服务运行在独立容器中。

#### 3 快速部署

传统部署：

````
安装环境
配置依赖
启动服务
````

Docker：

````
docker run
````

---
