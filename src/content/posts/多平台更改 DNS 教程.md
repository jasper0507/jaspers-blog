---
title: "多平台更改 DNS 教程"
description: "在 Windows、Android、iOS 和 macOS 上把 DNS 改成指定地址的步骤。"
publishedAt: "2026-08-20T09:18:00+08:00"
tags:
  - DNS
draft: false
# 禁止修改
id: 21
---

# 多平台更改 DNS 教程

## Windows

- 开始菜单搜索 `网络连接` ，点击打开 `查看网络连接`

![](https://storage.crisp.chat/users/helpdesk/website/d516709242f0180/11_1th80wp.jpg)

- 选择你目前连接的网络适配器（无线选WLAN，有线选以太网），点击 `属性`

![](https://storage.crisp.chat/users/helpdesk/website/d516709242f0180/12_w1l1wl.jpg)

- 双击 `Internet 协议版本 4 (TCP/IPv4)`

![](https://storage.crisp.chat/users/helpdesk/website/d516709242f0180/13_oy9wvo.jpg)

- 点击 `使用下面的 DNS 服务器地址(E):`
- 填入 `223.5.5.5` 和 `119.29.29.29`

![](https://storage.crisp.chat/users/helpdesk/website/d516709242f0180/14_eawdr0.jpg)

- 确定，确定

## Android

移动网络无解

- 进入设置，点击 `WLAN`

![](https://storage.crisp.chat/users/helpdesk/website/d516709242f0180/1_1ti9ob0.jpg)

- 长按你连接中的Wi-Fi，点击 `修改网络`

![](https://storage.crisp.chat/users/helpdesk/website/d516709242f0180/2_1shncao.jpg)

- 勾选“显示高级选项”，点击“IP”，选择“静态”

![](https://storage.crisp.chat/users/helpdesk/website/d516709242f0180/3_fnl4f4.jpg)

- “IP 地址”“网关”“网络前缀长度” 请自行折腾
- “域名 1”“域名 2” 填写 `223.5.5.5` 和 `119.29.29.29`
- 点击保存即可

![](https://storage.crisp.chat/users/helpdesk/website/d516709242f0180/4_1atyncc.jpg)

## iOS/iPadOS

- 进入设置，点击 `无线局域网`
- 点击已连接网络右侧的感叹号
- 配置 DNS >> 手动 >> 添加服务器
- `223.5.5.5` `119.29.29.29`
- 存储

## macOS

直接去苹果官网看吧

DNS 更改为 `223.5.5.5` 和 `119.29.29.29`

<https://support.apple.com/zh-cn/guide/mac-help/mchlp2720/>
