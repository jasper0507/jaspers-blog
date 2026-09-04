---
title: "Golang 入门指南：Start"
description: "记录 go mod init、go mod tidy 与 go test 的基本用法。"
publishedAt: "2026-07-21T02:07:00+08:00"
tags:
  - Go
draft: false
# 禁止修改
id: 13
---

# Start

## `go mod`

### `go mod init`

`go mod init [module-path]`

> `go mod init` 命令在当前目录中初始化并写入一个新的 `go.mod` 文件。
>
> *`[module-path]`：** 标识模块并作为模块内包导入路径前缀的路径。
>
> > 例如，`"github.com/jasper0507/net"`。

###  `go mod tidy`
- `go mod tidy `确保 go.mod 文件与模块中的源代码匹配。

- 它添加构建当前模块的包和依赖项所需的任何缺失模块依赖项，并删除对不提供任何相关包的模块的依赖项。

- 它还向 go.sum 添加任何缺失条目并删除不必要的条目。

## `go test`

```bash
go test              # 当前包
go test -v           # 详细列出每个测试
go test ./...        # 全项目，提交前必跑
go test -run TestHelloName   # 只跑匹配的（正则）
```
- 文件名 `xxx_test.go`，包名和被测代码相同（同包才能直接调用，不用 import）
- 函数名 `func TestXxx(t *testing.T)`，`Test` 前缀是唯一要求，工具不做任何"函数名→被测函数"的映射，测什么全看你在函数体里手写调用
```go
package greetings

import "testing"

func TestHelloName(t *testing.T) {
    msg, err := Hello("Gladys")
    if err != nil || msg == "" {
        t.Errorf("Hello(...) = %q, %v", msg, err)
    }
}
```

