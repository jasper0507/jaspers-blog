---
title: "如何刷新DNS缓存？"
description: "说明 DNS 缓存是什么，以及如何在 Windows、macOS 和常见浏览器里刷新它。"
publishedAt: "2026-08-20T09:20:00+08:00"
tags:
  - DNS
draft: false
# 禁止修改
id: 22
---

# 如何刷新DNS缓存？

DNS 缓存是一个临时数据库，用于存储有关以前的 DNS 查找的信息。

> 换句话说，每当你访问网站时，你的操作系统和网络浏览器都会保留该域和相应 IP 地址的记录。这消除了对远程 DNS 服务器重复查询的需要，并允许你的 OS 或浏览器快速解析网站的 URL。

但是在某些情况下，例如：对网络问题进行故障排除，或者在更改 DNS 解析器之后，你将需要刷新 DNS 缓存。这将清除缓存的 DNS 条目，并根据新配置的 DNS 设置执行后续查找以解析域。

本指南提供有关如何在不同的操作系统和 Web 浏览器上刷新 DNS 缓存的说明。

## 在 Windows 上清除/刷新 DNS 缓存

对于所有 Windows 版本，清除 DNS 缓存的过程都是相同的。你需要使用管理员权限打开命令提示符并运行 ipconfig /flushdns。

### 要在 Windows 系统上清除 DNS 缓存，请执行以下步骤：

按住Windows键与R键，在新打开的窗口中键入 cmd 并单击回车 。

在新打开的黑色/蓝色背景命令行上，键入以下行，然后按回车：

```
ipconfig /flushdns
```

成功后，系统将返回以下消息：

```
Windows IP Configuration

Successfully flushed the DNS Resolver Cache.
```

## 在 MacOS 上清除/刷新 DNS 缓存

根据你所运行的版本，在 MacOS 中刷新缓存的命令略有不同。该命令必须以具有系统管理员特权的用户（sudo 用户）身份运行。

### 要清除 MacOS 中的 DNS 缓存，请执行以下步骤：

打开查找器。

转到应用程序>实用程序>终端。这将打开终端窗口。

在命令行中，输入以下行，然后按回车：

```
$ sudo killall -HUP mDNSResponder
```

输入你的 sudo 密码，然后再次按回车。成功后，系统不会返回任何消息。

对于早期版本的 MacOS，刷新缓存的命令不同。

### MacOS 版本 10.11 和 10.9

```
$ sudo dscacheutil -flushcache
$ sudo killall -HUP mDNSResponder
```

### MacOS 版本 10.10

```
$ sudo discoveryutil mdnsflushcache
$ sudo discoveryutil udnsflushcaches
```

### MacOS 版本 10.6 和 10.5

```
$ sudo dscacheutil -flushcache
```

## 清除/刷新浏览器 DNS 缓存

大多数现代的 Web 浏览器都有一个内置的 DNS 客户端，以防止每次访问该网站时重复查询。

### 谷歌浏览器 Chrome

要清除 Google Chrome 的 DNS 缓存，请执行以下步骤：

打开一个新标签，然后在地址栏输入 chrome://net-internals/#dnsChrome。

点击 “清除主机缓存” 按钮。

如果那对你不起作用，请尝试清除缓存和 Cookie。

按下 CTRL+Shift+Del 以打开 “清除浏览数据” 对话框窗口。

选择一个时间范围。选择 “所有时间” 以删除所有内容。

选中 “Cookie 和其他站点数据” 和 “缓存的图像和文件” 框。

点击 “清除数据” 按钮。

此方法适用于所有基于 Chrome 的浏览器，包括 Chromium，Vivaldi 和 Opera。

### 火狐 Firefox

要清除 Firefox 的 DNS 缓存，请执行以下步骤：

在右上角，单击汉堡包图标 ☰ 以打开 Firefox 的菜单：

点击 ⚙ Options (Preferences) 链接。

单击左侧的 “隐私和安全性” 或 “隐私” 选项卡。

向下滚动到该 History 部分，然后单击 Clear History... 按钮。

选择要清除的时间范围。选择 “所有内容” 以删除所有内容。

选择所有框，然后单击 “立即清除” 。

如果这对你不起作用，请尝试以下方法并暂时禁用 DNS 缓存。

打开一个新标签，然后在 Firefox 的地址栏中输入 about:config 。

搜索 network.dnsCacheExpiration，将值暂时设置为 0，然后单击 “确定”。然后，改回默认值，然后单击 “确定” 。

搜索 network.dnsCacheEntries，将值暂时设置为 0，然后单击 “确定” 。然后，改回默认值，然后单击 “确定”。
