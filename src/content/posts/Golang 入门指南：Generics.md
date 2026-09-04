---
title: "Golang 入门指南：Generics"
description: "函数类型参数、comparable 约束，以及参数化的泛型类型。"
publishedAt: "2026-07-22T03:03:00+08:00"
tags:
  - Go
draft: false
# 禁止修改
id: 16
---

# Generics

## Type parameters

函数的类型参数出现在方括号中，位于函数参数之前。

`func Index[T comparable](s []T, x T) int`

* `T`：类型参数，使函数适用于多种类型。
* `comparable`：限制 `T` 必须支持 `==` 和 `!=`的约束。

## Generic types

类型可以用类型参数进行参数化，这对于实现 泛型数据结构可能很有用。

```go
// List represents a singly-linked list that holds
// values of any type.
type List[T any] struct {
	next *List[T]
	val  T
}
```
