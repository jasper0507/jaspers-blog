---
title: "Golang 入门指南：Basic"
description: "按 Tour 整理包与导出规则、流程控制，以及数组、切片、map、结构体、指针等基础类型。"
publishedAt: "2026-07-21T21:06:00+08:00"
tags:
  - Go
draft: false
# 禁止修改
id: 14
---

# Basic

## Packages, variables, and functions

1. Packages

- 每个 Go 程序都由包（package）组成。

- 程序从 `main` 包开始运行。

```go
package main

import (
	"fmt"
	"math"
)

func main() {
	fmt.Printf("Now you have %g problems.\n", math.Sqrt(7))
}
```

2. Exported

在 Go 中，如果一个名称以大写字母开头，则它是导出的（exported）。

> 导入一个包时，你只能引用它的导出名称。 任何“未导出”的名称在包外都无法访问。

3.  Functions

类型写在变量名之后。([点击了解](https://go.dev/blog/declaration-syntax))
```go
func add(x int, y int) int {
	return x + y
}
```
当两个或多个连续的已命名函数参数共享同一类型时，除最后一个外可以省略类型。
```go
func add(x, y int) int {
	return x + y
}
```

4. Multiple results

函数可以返回任意数量的结果。
```go
func swap(x, y string) (string, string) {
	return y, x
}
```

5. Variables

var 语句声明一个**变量列表**；与函数参数列表一样，类型在最后。
```go
package main

import "fmt"

var c, python, java bool

func main() {
	var i int
	fmt.Println(i, c, python, java)
}
```
6. Variables with initializers

- var 声明可以包含初始值，每个变量对应一个。
- 如果存在初始值，可以省略类型；变量会采用初始值的类型。
- 变量声明也可以像导入语句一样“分组”成块。
```go
package main

import "fmt"

var i, j int = 1, 2 

func main() {
	var c, python, java = true, false, "no!"
	fmt.Println(i, j, c, python, java)
}
```
7. Short variable declarations

- 在函数内部，可以用 := 短赋值语句代替带隐式类型的 var 声明。
- ==在函数外，每条语句都以关键字开头（var 、 func 等），因此无法使用 := 结构。==
- 在 `:=` 声明中，允许重复赋值，前提是：

  - 初始化中的相应值可赋值给 `v`。

  - ==声明至少创建了一个其他变量。==

8. Basic types

Go 的基本类型有:

```txt
bool

string

int  int8  int16  int32  int64
uint uint8 uint16 uint32 uint64 uintptr

byte // alias for uint8 
	 //	常以[]byte形式出现

rune // alias for int32
     // 常用来处理 UTF-8 字符串

float32 float64

complex64 complex128
```

> `int 、 uint` 和 `uintptr` 类型在 32 位系统上通常为 32 位宽，在 64 位系统上为 64 位宽。 
>
> 当你需要一个整数值时，应使用 `int`，除非你有特定理由使用定宽或无符号整数类型。

9.  Zero values

声明时**没有显式初始值**的变量会被赋予 零值（zero value）。

| 类型       | 零值  |
| ---------- | ----- |
| 数值类型   | 0     |
| 布尔类型   | false |
| 字符串类型 | ""    |
| 指针       | nil   |
| 切片       | nil   |
| 映射       | nil   |

10. Type conversions

表达式 T(v) 将值 v 转换为类型 T。
> `f := float64(i)`
>
> 在 Go 中不同类型的项之间赋值需要显式转换

字符串转整数：

`n, err := strconv.Atoi("123")`

整数转字符串：

`s := strconv.Itoa(123)` 

11. Constants

- 使用 `const` 声明常量，不能使用 `:=`。
- `iota` 在每个 `const` 块中从 `0` 开始，每项加 `1`。
- 省略表达式时，会重复上一项的表达式。

```go
type ByteSize int

const (
	_  = iota             // 0，忽略
	KB ByteSize = 1 << (10 * iota) // 1 << 10
	MB                            // 1 << 20
	GB                            // 1 << 30
)

fmt.Println(KB) // 1024
fmt.Println(MB) // 1048576
```

12. Numeric Constants

```go
const MaxRetry = 3       // 无类型常量

const Timeout int = 30  // 有明确类型
```

- 无类型数值常量在编译期可以表示很大、很高精度的值；只有赋给或转换为具体类型时，编译器才检查该类型能否表示它。
- 无类型常量会根据上下文采用所需类型；没有明确上下文时，会采用默认类型，如整数默认 int、浮点数默认 float64。

> 实际开发中，普通固定值通常写成无类型常量；只有 API、协议或业务明确要求具体类型时，才显式标注类型。

```go
	const n = 3 // 无类型整数常量

	var a int64 = n // 根据上下文采用 int64
	b := n          // 无明确上下文，默认采用 int

	const big = 1 << 100 // 无类型常量可以表示这个大数
	var c int64 = big    // 编译错误：big 超出 int64 的范围
```

13. format verb

| 动词            | 用途         | 常见场景                   |
| ------------- | ---------- | ---------------------- |
| `%v`          | 按默认格式输出任意值 | 日志、临时调试                |
| `%+v`         | 输出结构体字段名和值 | 查看完整结构体                |
| `%s`          | 字符串        | 拼接提示、日志信息              |
| `%q`          | 带引号的字符串    | 检查空格、换行等特殊字符           |
| `%d`          | 十进制整数      | ID、数量、状态码              |
| `%f` / `%.2f` | 浮点数        | 金额、比例、小数               |
| `%t`          | 布尔值        | 开关状态、判断结果              |
| `%T`          | 值的类型       | 调试接口和类型转换              |
| `%w`          | 包装错误       | `fmt.Errorf` 返回带上下文的错误 |
| `%x`          | 十六进制       | 字节、哈希、二进制数据            |

14. init function

- `init()` 用于包的初始化，无参数、无返回值，由 Go 自动调用。
- 每个源文件可以定义多个 `init()`。
- 执行顺序：

```text
导入包初始化
→ 包级变量初始化
→ init()
→ main()
```

常用于程序运行前的检查、补充默认值或注册配置：

```go
var user = os.Getenv("USER")
var home = os.Getenv("HOME")

func init() {
	if user == "" {
		log.Fatal("$USER not set")
	}
	if home == "" {
		home = "/home/" + user
	}
}

func main() {
	// init 执行完成后才会进入 main
}
```

---

## Flow control statements

1. For

基本的 for 循环有三个由分号分隔的组成部分：
- 初始化语句：在第一次迭代之前执行
- 条件表达式：在每次迭代之前求值
- 后置语句：在每次迭代结束时执行

> 初始化语句通常是一个短变量声明，在那里声明的变量 仅在 for 语句的作用域内可见。

2. For is Go's "while"

其中，初始化语句和后置语句是可选的。
```go
for sum < 1000 {
	sum += sum
}
```

3. Forever

如果省略循环条件，它会永远循环，因此可以很紧凑地表达无限循环。
```go
func main() {
	for {
	}
}
```

4. If

- Go的if 语句允许在条件之前加以一个简短语句开始执行。
- 在 if 简短语句中声明的变量，在任何对应的 else 块中也可用。
```go
func pow(x, n, lim float64) float64 {
	if v := math.Pow(x, n); v < lim {
		return v
	} else {
		fmt.Printf("%g >= %g\n", v, lim)
	}
	// can't use v here, though
	return lim
}
```

5. Switch

switch 语句是编写一连串 if - else 语句的更短方式。 它会运行第一个值等于条件表达式的 case。
> - Go 只运行被选中的 case，而不会继续执行后面的 case。
>
> > 类似C语言中每个 case 末尾所需的 break 语句 在 Go 中是自动提供的。
>
> - Go 的 switch case 不必是常量， 所涉及的值也不必是整数。

```go
	switch os := runtime.GOOS; os {
	case "darwin":
		fmt.Println("macOS.")
	case "linux":
		fmt.Println("Linux.")
	default:
		fmt.Printf("%s.\n", os)
	}
```
fallthrough 关键字可以强制执行下一个 case：

```go
switch 2 {
case 1:
    fmt.Println("1")
case 2:
    fmt.Println("2") // 输出：2
    fallthrough      // 强制执行下一个case
case 3:
    fmt.Println("3") // 输出：3（因fallthrough被执行）
}
```

6. Swich with no condition

没有条件的 switch 与 switch true 相同。
这种结构可以干净地写出很长的 if-then-else 链。
实际开发中，无条件 switch 很适合表示多个互斥的范围判断：
```go
switch {
case t.Hour() < 12:
	fmt.Println("Good morning!")
case t.Hour() < 17:
	fmt.Println("Good afternoon.")
default:
	fmt.Println("Good evening.")
}
```
等价于
```go
if t.Hour() < 12 {
	fmt.Println("Good morning!")
} else if t.Hour() < 17 {
	fmt.Println("Good afternoon.")
} else {
	fmt.Println("Good evening.")
}
```
switch true更加优雅

7. Defer

- defer 语句会将函数的执行推迟到外围函数返回时。
- 被推迟调用的参数会**立即求值**，但函数调用本身直到外围函数返回时才会执行。
- 被推迟的函数调用会压入一个栈中。当函数返回时， 其被推迟的调用按**后进先出**的顺序执行。

---

## More types

### 自定义type

```go
// 基于int创建自定义类型MyInt（全新类型）
type MyInt int

// 基于[]int创建自定义类型IntSlice（全新类型）
type IntSlice []int

// 基于struct创建自定义类型User（结构体类型）
type User struct {
    Name string
    Age  int
}

// 基于函数类型创建自定义类型MathFunc
type MathFunc func(int) int
```

### Points

#### 定义
指针保存一个值的内存地址。

> 与 C 不同，Go 没有指针运算。

- `&` 操作符会生成指向其操作数的指针。

```
i := 42
p = &i
```

- `*` 操作符表示指针的底层值。

```
fmt.Println(*p) // read i through the pointer p
*p = 21         // set i through the pointer p
```

这称为“解引用”（dereferencing）或“间接引用”（indirecting）。

#### new 和 make

1. `func new(Type) *Type`
> 创建变量，将变量初始化为该类型的零值，返回指针。

2. `func make(t Type, size ...IntegerType) Type`
> 初始化 slice、map、channel，返回值本身。

```go
new(int)          // *int，指向零值 0
new(string)       // *string，指向零值 ""
new([]int)        // *[]int，指向一个 nil 切片，较少使用
new(int64(300))   // *int64，指向初始值 300（Go 1.26+）

make([]int, 10, 100)     // 长度 10、容量 100 的切片
make(map[string]int, 10) // 创建 map，10 是初始容量提示
make(chan int, 10)       // 创建缓冲区大小为 10 的通道
```

### Structs

#### 定义

`struct` 是一组字段（field）的集合。

> 字段通常由“字段名 + 字段类型”组成。

```go
type Rectangle struct {
  height, width, area int
  color               string
}
```

#### 实例化

```go
programmer := Programmer{
   Name:     "jack",
   Age:      19,
   Job:      "coder",
   Language: []string{"Go", "C++"},
}
```

#### 访问

- 结构体字段使用点号访问。

- 结构体字段可以通过结构体指针访问。

  > 对结构体指针使用 `v.X` 时，Go 会自动将它理解为 `(*v).X`。

```go
	v := &Vertex{1, 2}
	v.X = 1e9 // (*v).X
```

### Slices

#### Arrays

类型 [n]T 是由 n 个类型为 T 的值组成的数组。
> `var a [10]int`

数组的长度是其类型的一部分，因此数组不能调整大小

初始化：

`arr := [3]int{1,2,3}`或`arr := […]int{0:1, 1:23, 2:34, 3:43, 5:53}`

####  Slices

- 切片（slice）是对数组元素的动态大小、灵活视图。
- 类型 []T 是元素类型为 T 的切片。

```
type sliceHeader struct {
    ptr   *[]byte // 指向底层数组的指针
    len   int     // 切片长度
    cap   int     // 切片容量
}
```

切片通过指定两个下标形成，即一个下界和一个上界，用冒号分隔
```go
	primes := [6]int{2, 3, 5, 7, 11, 13}
	var s []int = primes[1:4]	// 左闭右开
```
也可以省略上界或下界，改用默认值。
对于数组`var a [10]int`,以下切片表达式是等价的
```go
a[0:10]
a[:10]
a[0:]
a[:]
```


#### Slices are like references to arrays

切片本身不存储任何数据， 它只描述底层数组的一段。
> 更改切片的元素会修改其底层数组中对应的元素。
> 
> 共享同一底层数组的其他切片也会看到这些更改。

```go
package main

import "fmt"

func main() {
	arr := [4]int{10, 20, 30, 40}

	a := arr[0:3] // 对应 arr[0] 到 arr[2]
	b := arr[1:4] // 对应 arr[1] 到 arr[3]

	a[1] = 99 // 修改的是底层数组的 arr[1]

	fmt.Println(arr) // [10 99 30 40]
	fmt.Println(a)   // [10 99 30]
	fmt.Println(b)   // [99 30 40]
}
```

#### Slice literals

切片字面量类似于没有长度的数组字面量

对于`[3]bool{true, true, false}`

Go会先创建与上面相同的**底层数组**， 然后构建一个**引用**它的切片：

`[]bool{true, true, false}`

#### Slice length and capacity

- 切片既有 *长度*（length），也有 *容量*（capacity）。

- 切片的长度是它包含的元素个数。通过`len()`获取

- 切片的容量是*底层数组*中、从切片第一个元素起算的元素个数。通过`cap()`获取

#### Creating a slice with make

切片可以用内建的 `make` 函数创建。

`make` 函数会分配一个清零的数组， 并返回引用该数组的切片：

```
a := make([]int, 5)  // len(a)=5
```

要指定容量，向 `make` 传入第三个参数：

```
b := make([]int, 0, 5) // len(b)=0, cap(b)=5

b = b[:cap(b)] // len(b)=5, cap(b)=5
b = b[1:]      // len(b)=4, cap(b)=4
```

#### Appending to a slice

 Go 提供了内建的 `append` 函数。

```
func append(s []T, vs ...T) []T
```

`append` 的第一个参数 `s` 是类型为 `T` 的切片，其余是要追加到该切片的 `T` 值。

`append` 的结果是一个包含原切片所有元素以及所提供值的*切片*。

如果 `s` 的后备数组太小，装不下所有给定值，就会分配一个更大的数组。返回的切片将指向*新分配的数组*。

将元素附加到切片的末尾并返回结果：

```go
x := []int{1,2,3}
x = append(x, 4, 5, 6)
fmt.Println(x)
```
将一个切片附加到另一个切片：
```go
x := []int{1,2,3}
y := []int{4,5,6}
x = append(x, y...)
fmt.Println(x)
```

> 当函数的最后一个参数是**可变参数** `...T` 时，可以使用 `slice...` 将一个切片展开成多个参数传入。

#### slice of slices

```go
func Pic(dx, dy int) [][]uint8 {
	// 先创建外层切片，长度为 dy。
	// 每个元素的类型是 []uint8，初始值都是 nil。
	result := make([][]uint8, dy)

	for i := range dy {
		// 为第 i 行创建一个长度为 dx 的 uint8 切片。
		// 至此，二维切片拥有 dy 行，每行 dx 列。
		result[i] = make([]uint8, dx)

		for j := range dx {
			// 设置第 i 行、第 j 列的元素。
			result[i][j] = uint8(i ^ j)
		}
	}

	return result
}
```

#### Range

`for` 循环的 `range` 形式会遍历Slices或Map。

在对Slices使用 range 时，每次迭代会返回两个值。 第一个是下标，第二个是该下标处元素的副本。

在对Map使用 range 时，每次迭代会返回两个值。 第一个是key，第二个是value。

```go
for i, v := range pow{
}
```

可以通过赋给 `_` 来跳过下标或值。

```go
for _ , v := range pow{
}
```

只需要下标，可以省略第二个变量。

```go
for i := range pow{
}
```

不需要变量，可以直接：

```go
for range 10{
}
```

### Maps

#### Map

映射（map）将键映射到值。

映射的零值是 `nil`。 `nil` 映射没有键，也不能添加键。

```
type hmap struct {
    count     int       // 哈希表中实际存储的键值对总数
    B         uint8     // 桶数组的大小指数（桶数量 = 2^B，比如B=3则有8个桶）
    buckets   unsafe.Pointer // 指向桶数组（bmap数组）的指针
    hash0     uint32    // 哈希种子（随机数，避免哈希碰撞攻击）
    // 其他辅助字段：溢出桶指针、扩容标记、迭代器状态等
}
```

`make` 函数返回给定类型的映射， 已初始化并可供使用。

```go
m = make(map[string]Vertex)
```

#### Map literals

映射字面量类似结构体字面量，但键是必需的。

```go
type Vertex struct {
	Lat, Long float64
}

var m = map[string]Vertex{
	"Bell Labs": {40.68433, -74.39967},
	"Google":    {37.42202, -122.08408},
}
```

#### Mutating Maps

在映射 `m` 中插入或更新元素：

```
m[key] = elem
```

获取元素：

```
elem = m[key]
```

删除元素：

```
delete(m, key)
```

> 即使键已从映射中缺失，执行此操作也是安全的。

用双赋值测试某个键是否存在：

```
v, ok := m[key]
```

如果 `key` 在 `m` 中，`v`为`m[key]`,`ok` 为 `true`。

如果 `key` 不在映射中，则 `elem` 是该映射元素类型的零值， `ok` 为 `false`。

### Function

#### Function values

函数也是值。它们可以像其他值一样传递。

函数值可以用作函数参数和返回值。

函数变量也有类型，比如`func add(a, b int) int { return a + b }`类型是`func(int, int) int`

```go
package main

import "fmt"

func add(a, b int) int {
	return a + b
}

// 接收函数作为参数，并返回这个函数
func use(f func(int, int) int) func(int, int) int {
	fmt.Println(f(1, 2))
	return f
}

func main() {
	fn := use(add)      // add 作为参数传入
	fmt.Println(fn(3, 4)) // 函数作为返回值：7
}
```

#### Function closures

- 闭包是一个函数值，它引用了函数体之外的变量。

- 该函数可以访问并赋值这些被引用的变量；从这个意义上说，函数被“绑定”到了这些变量上。
  > 闭包不是单独一段函数代码，而是“函数代码 + 被捕获变量的环境”。
  >
  > 闭包让局部变量的生命周期脱离原函数栈帧，改为跟随闭包本身。

```go
package main

import "fmt"

func fibonacci() func() int {
	prenum,num:=0,1
	return func() int {
		result:=prenum
		prenum,num=num,num+prenum
		return result
	}
}

func main() {
	f := fibonacci()
	for i := 0; i < 10; i++ {
		fmt.Println(f())
	}
}
```

