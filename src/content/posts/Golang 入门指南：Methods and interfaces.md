---
title: "Golang 入门指南：Methods and interfaces"
description: "说明 Go 方法接收者、接口的隐式实现、类型断言和常用接口。"
publishedAt: "2026-07-22T01:36:00+08:00"
tags:
  - Go
draft: false
# 禁止修改
id: 15
---

# Methods and interfaces

## Methods

### Methods are functions

方法是带有特殊 *接收者*（receiver）参数的函数。

接收者出现在自己的参数列表中，位于 `func` 关键字和方法名之间。

```go
type Vertex struct {
	X, Y float64
}

func (v Vertex) Abs() float64 {
	return math.Sqrt(v.X*v.X + v.Y*v.Y)
}

// 功能上等价
// func Abs(v Vertex) float64 {
//     return math.Sqrt(v.X*v.X + v.Y*v.Y)
// }
// 方法调用 v.Abs() 只是比普通函数调用 Abs(v) 更符合“某个类型具有某种行为”的表达方式。
```

只能为当前包中定义的命名类型添加方法。不止结构体，还有类型别名。

```go
type MyFloat float64

func (f MyFloat) Abs() float64 {
	if f < 0 {
		return float64(-f)
	}
	return float64(f)
}
```
### value or pointer receiver

- 值接收者传对象的副本，指针接收者传对象地址的副本。

- 普通函数：参数类型必须严格匹配，自己写 & 或 *

- 方法调用：Go 会为**接收者**自动补 & 或 *

> 在实战中，一般使用指针接收者
> > 第一，这样方法可以修改其接收者指向的值。
> > 
> > 第二，可以避免在每次方法调用时复制该值。
> > 
>
> 一般而言，给定类型上的所有方法应当要么都用值接收者，要么都用指针接收者，而不应混用两者。

---

## Interfaces

### Define

*接口类型*被定义为一组方法签名

> 接口只规定某个类型必须有哪些方法
>
> 方法签名=方法名+参数类型+返回值类型

*接口值*= 具体值 + 具体类型

> - 具体值负责提供数据；
> - 具体类型负责决定调用哪个方法。
> - 在接口值上调用方法会执行**其底层类型上**同名的方法。

### Interfaces are implemented implicitly

```go
type I interface {
	M()
}
type T struct {
	S string
}
// 此方法表示类型 T 实现了接口 I,
// 但我们无需明确声明
func (t T) M() {
	fmt.Println(t.S)
}
func main() {
	var i I = T{"hello"}
	i.M()
}
```

### Method set

*业务实体默认用 \*T；小型不可变值类型可以用 T。一个类型的方法接收者尽量统一。*

T 的方法集： 只包含接收者为 T 的方法 

*T 的方法集： 包含接收者为 T 和 *T 的方法

> *T → T
>
> 可以直接解引用并复制，所以总是可行。
>
> T → *T
>
> 需要 T 有稳定、可取的地址，但接口中的 T 值副本不保证可取地址。

```go
type I interface{
	M() 
} 
type T struct{} 
func (*T) M() {} 
var t T 
var _ I = &t // 正确：动态类型是 *T 
var _ I = t // 错误：T 的方法集没有 M
```

### The empty interface

指定了零个方法的接口类型称为 空接口（empty interface）：`interface{}`或`any`
- 空接口可以保存任意类型的值。（每个类型至少实现了零个方法）
- 空接口被用于处理未知类型的值的代码。 

### Type assertions

类型断言（type assertion）提供对接口值底层具体值的访问。

1. `t := i.(T)`
> 该语句断言接口值 i 保存了具体类型 T， 并将底层的 T 值赋给变量 t。
>
> 如果 i 没有保存 T，该语句会触发 panic。

2. `t, ok := i.(T)`
> 如果 i 保存了 T，则 t 将是底层值，ok 为 true。
>
> 否则，t 为类型 T 的零值，ok 为 false， 且不会发生 panic。

### Type switches

*类型选择*（type switch）是一种允许连续进行多个类型断言的构造。

类型选择中的声明与类型断言 `i.(T)` 的语法相同， 但具体类型 `T` 被替换为关键字 `type`。

```go
package main

import "fmt"

func do(i interface{}) {
	switch v := i.(type) {
	case int:
		fmt.Printf("Twice %v is %v\n", v, v*2)
	case string:
		fmt.Printf("%q is %v bytes long\n", v, len(v))
	default:
		fmt.Printf("I don't know about type %T!\n", v)
	}
}

func main() {
	do(21)
	do("hello")
	do(true)
}

```

### 常用接口

1. [`fmt.Stringer`](https://pkg.go.dev/fmt#Stringer) 用于定义类型的字符串表示：

```go
type Stringer interface {
	String() string
}
```

类型实现 `String() string` 后，`fmt` 打印该值时会自动调用它。

```go
type Person struct {
	Name string
	Age  int
}

func (p Person) String() string {
	return fmt.Sprintf("%s (%d years)", p.Name, p.Age)
}

func main() {
	p := Person{"Arthur", 42}
	fmt.Println(p) // Arthur (42 years)
}
```

注意：`String()` 中不要直接格式化接收者本身，否则会无限递归。

```go
type MyString string

func (m MyString) String() string {
	return fmt.Sprintf("MyString=%s", m) // 错误：无限递归
}
```

原因：

```text
fmt 打印 m
→ 调用 m.String()
→ Sprintf 再次打印 m
→ 再次调用 m.String()
→ 无限重复
```

应先转换为没有实现 `String()` 的基础类型：

```go
func (m MyString) String() string {
	return fmt.Sprintf("MyString=%s", string(m))
}
```

2. `error` 类型是一个类似 `fmt.Stringer` 的内建接口
```go
   type error interface {
       Error() string
   }
```
> 与 `fmt.Stringer` 一样，`fmt` 包在打印值时会查找 `error` 接口。

```go
package main

import (
	"fmt"
	"time"
)

type MyError struct {
	When time.Time
	What string
}

func (e *MyError) Error() string {
	return fmt.Sprintf("at %v, %s",
		e.When, e.What)
}

func run() error {
	return &MyError{
		time.Now(),
		"it didn't work",
	}
}

func main() {
	if err := run(); err != nil {
		fmt.Println(err)
	}
}

```

函数经常返回一个 `error` 值，调用方应通过测试错误是否等于 `nil` 来处理错误。
> 实际开发中一般**不需要**实现 Go 内建的 error 接口，自定义错误类型。
>
> 大多数场景用：
>
> ```go
> errors.New("固定错误")
> fmt.Errorf("带变量的错误: %v", value)
> fmt.Errorf("补充上下文: %w", err)
> ```

3. [`sort.Interface`](https://pkg.go.dev/sort#Interface) 用于描述可排序的数据：

```go
type Interface interface {
	Len() int
	Less(i, j int) bool
	Swap(i, j int)
}
```

类型只要实现这三个方法，就自动实现 `sort.Interface`：

```go
type Sequence []int

func (s Sequence) Len() int {
	return len(s)
}

func (s Sequence) Less(i, j int) bool {
	return s[i] < s[j]
}

func (s Sequence) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}
```

`sort.Sort` 接收的参数类型正是 `sort.Interface`：

```go
func Sort(data sort.Interface)
```

因此，`Sequence` 满足参数要求，可以直接传入：

```go
func main() {
	s := Sequence{3, 1, 2}
	sort.Sort(s)

	fmt.Println(s) // [1 2 3]
}
```

> 注意：实现接口并不是让 `Sequence` 获得了 `Sort` 方法，而是让它满足了 `sort.Sort` 的参数要求。

`Swap` 使用值接收者仍然可以修改元素，因为切片副本和原切片共享同一个底层数组：

```go
func (s Sequence) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}
```

