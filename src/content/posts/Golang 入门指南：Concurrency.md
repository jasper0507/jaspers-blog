---
title: "Golang 入门指南：Concurrency"
description: "整理 goroutine、channel、select 与 sync.Mutex，强调用通信来分享内存。"
publishedAt: "2026-07-24T11:49:00+08:00"
tags:
  - Go
draft: false
# 禁止修改
id: 17
---

# Concurrency

## Goroutines

*goroutine* 是由 Go 运行时管理的轻量级线程。

`go f(x, y, z)`会启动一个新的 goroutine 来运行

## Channel

### 定义

通道（channel）是带类型的管道，负责在多个 goroutine 之间传递数据并进行同步。

> 不要通过共享内存来通信，而要通过通信来共享内存。
>
> > 不要让多个 goroutine 随意共同修改数据；通过 channel 明确数据由谁处理、何时交接。

### 创建
通道在使用前必须创建：`ch := make(chan int)`

### 读写

通过通道操作符 `<-` 发送和接收值。

```go
ch <- v    // Send v to channel ch.
v := <-ch  // Receive from ch, and
           // assign value to v.
```

### Buffered Channels

通道可以是 带缓冲的。

```
ch := make(chan int, 100)
```

> 对于管道而言，`make` 函数接收两个参数，第一个是管道的类型，第二个是可选参数为管道的缓冲大小。
>
> 向带缓冲的通道发送仅在缓冲区已满时才会阻塞。接收在缓冲区为空时阻塞。

### Range and Close

- 发送者可以 `close()` 一个通道，以表示不会再发送更多值。

  > `close` 的作用不是“释放资源”，而是通知接收方这个 channel 以后不会再有新值了。

- 接收者可以通过为接收表达式赋第二个参数来测试通道是否已关闭

  > 在`v, ok := <-ch`之后，如果没有更多值可接收且通道已关闭，则 `ok` 为 `false`。

循环 `for i := range c` 会反复从通道接收值，直到它被关闭。

> **注意：只有发送者应关闭通道，永远不要由接收者关闭。**向已关闭的通道发送会导致 panic。
>
> 只有接收者需要知道“数据已经发送完毕”时，发送者才需要关闭 channel；
>
> 普通的一次发送、一次接收通常不用关闭。

## Select

`select` 语句让一个 goroutine 可以等待多个通信操作。

`select` 会阻塞，直到某个 case 可以运行，然后执行该 case。如果多个 case 都已就绪，它会随机选择一个。

```go
package main

import "fmt"

func fibonacci(c, quit chan int) {
	x, y := 0, 1
	for {
		select {
		case c <- x:
			x, y = y, x+y
		case <-quit:
			fmt.Println("quit")
			return
		}
	}
}

func main() {
	c := make(chan int)
	quit := make(chan int)
	go func() {
		for i := 0; i < 10; i++ {
			fmt.Println(<-c)
		}
		quit <- 0
	}()
	fibonacci(c, quit)
}

```

如果没有其他 case 就绪，`select` 中的 `default` case 就会运行。

```go
select {
case i := <-c:
    // use i
default:
    // receiving from c would block
}
```

## sync.Mutex

互斥(mutual exclusion)：同一时刻只允许一个 goroutine 访问共享数据，其他 goroutine 必须等待，从而避免并发读写冲突。

> 提供该能力的数据结构的惯用名称是 *互斥锁*（mutex）。

Go 的标准库通过 [`sync.Mutex`](http://127.0.0.1:3999/pkg/sync/#Mutex) 及其两个方法提供互斥：

- `Lock`
- `Unlock`

```go
package main

import (
	"fmt"
	"sync"
)

var (
	count int
	mu    sync.Mutex
)

func inc() {
	mu.Lock()
	defer mu.Unlock()

	count++
}

func main() {
	var wg sync.WaitGroup

	for i := 0; i < 1000; i++ {
		wg.Add(1) // 待完成的 goroutine 数量加 1

		go func() {
			// 当前 goroutine 结束时，将待完成数量减 1
			defer wg.Done()

			inc()
		}()
	}

	wg.Wait() // 等待计数减到 0，即所有 goroutine 执行完成
	fmt.Println(count)
}
```
