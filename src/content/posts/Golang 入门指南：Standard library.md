---
title: "Golang 入门指南：Standard library"
description: "按包速查 fmt、strings、strconv、errors、time、slices、maps、os、filepath、io、slog 和 uuid。"
publishedAt: "2026-07-24T23:03:00+08:00"
tags:
  - Go
draft: false
# 禁止修改
id: 18
---

# Standard library

[官方标准库](https://pkg.go.dev/std)

## fmt

### Format Verb

| 动词     | 用途         | 典型示例                                             | 输出示例                          |
| ------ | ---------- | ------------------------------------------------ | ----------------------------- |
| `%v`   | 按默认格式输出任意值 | `fmt.Printf("%v", []int{1, 2, 3})`               | `[1 2 3]`                     |
| `%+v`  | 输出结构体字段名和值 | `fmt.Printf("%+v", User{ID: 1, Name: "Jasper"})` | `{ID:1 Name:Jasper}`          |
| `%s`   | 输出字符串      | `fmt.Printf("用户名：%s", "Jasper")`                 | `用户名：Jasper`                  |
| `%q`   | 带引号输出字符串   | `fmt.Printf("%q", " Jasper\n")`                  | `" Jasper\n"`                 |
| `%d`   | 输出十进制整数    | `fmt.Printf("状态码：%d", 404)`                      | `状态码：404`                     |
| `%f`   | 输出浮点数      | `fmt.Printf("%f", 19.9)`                         | `19.900000`                   |
| `%.2f` | 保留两位小数     | `fmt.Printf("金额：%.2f 元", 19.9)`                  | `金额：19.90 元`                  |
| `%t`   | 输出布尔值      | `fmt.Printf("登录状态：%t", true)`                    | `登录状态：true`                   |
| `%T`   | 输出值的类型     | `fmt.Printf("%T", 3.14)`                         | `float64`                     |
| `%w`   | 包装原始错误     | `fmt.Errorf("读取配置失败: %w", os.ErrNotExist)`       | `读取配置失败: file does not exist` |
| `%x`   | 输出十六进制     | `fmt.Printf("%x", []byte{0x47, 0x6f})`           | `476f`                        |

### Println

适合临时输出和简单调试
```go
name := "Jasper"
age := 20
fmt.Println("用户信息：", name, age) // 输出: 用户信息： Jasper 20
```
Println 会自动：

- 在参数之间加空格；
- 在末尾换行。

### Printf

```go
name := "Jasper"
age := 20
fmt.Printf("姓名：%s，年龄：%d\n", name, age)
```

> `Printf` 不会自动换行

### Sprintf

```go
name := "Jasper"
age := 20

message := fmt.Sprintf("用户 %s 的年龄是 %d 岁", name, age)	
// 返回一个字符串
```

### Errorf

用于给错误增加上下文
```go
data, err := os.ReadFile("config.json")
if err != nil {
	return fmt.Errorf("读取配置文件失败: %w", err)
}
```

## string

### Common Functions

| 函数          | 用途                                       | 典型示例                                    | 返回结果                 |
| ------------- | ------------------------------------------ | ------------------------------------------- | ------------------------ |
| `Contains`    | 是否包含子串                               | `strings.Contains("user@example.com", "@")` | `true`                   |
| `HasPrefix`   | 是否以指定内容开头                         | `strings.HasPrefix("/api/users", "/api")`   | `true`                   |
| `HasSuffix`   | 是否以指定内容结尾                         | `strings.HasSuffix("main.go", ".go")`       | `true`                   |
| `TrimSpace`   | 删除首尾的空格、换行符和制表符等空白字符。 | `strings.TrimSpace("  Go\n")`               | `"Go"`                   |
| `Split`       | 按分隔符切分                               | `strings.Split("Go,Gin,GORM", ",")`         | `["Go" "Gin" "GORM"]`    |
| `Fields`      | 按连续空白切分                             | `strings.Fields("go   run main.go")`        | `["go" "run" "main.go"]` |
| `Join`        | 拼接字符串切片                             | `strings.Join([]string{"Go", "Gin"}, ", ")` | `"Go, Gin"`              |
| `ReplaceAll`  | 替换所有匹配内容                           | `strings.ReplaceAll("a-b-c", "-", "_")`     | `"a_b_c"`                |
| `NewReplacer` | 创建可重复使用的替换器                     | `strings.NewReplacer(".", "_")`             | `*strings.Replacer`      |
| `Cut`         | 在第一个分隔符处切开                       | `strings.Cut("port=8080", "=")`             | `"port", "8080", true`   |
| `EqualFold`   | 忽略大小写比较                             | `strings.EqualFold("go", "GO")`             | `true`                   |
| `ToLower`     | 转为小写                                   | `strings.ToLower("GoLang")`                 | `"golang"`               |
| `ToUpper`     | 转为大写                                   | `strings.ToUpper("GoLang")`                 | `"GOLANG"`               |

## strconv

### Common Functions

| 函数          | 用途               | 典型示例                                | 返回结果    |
| ------------- | ------------------ | --------------------------------------- | ----------- |
| `Atoi`        | 字符串转 `int`     | `strconv.Atoi("8080")`                  | `8080, nil` |
| `Itoa`        | `int` 转字符串     | `strconv.Itoa(404)`                     | `"404"`     |
| `ParseBool`   | 字符串转 `bool`    | `strconv.ParseBool("true")`             | `true, nil` |
| `FormatBool`  | `bool` 转字符串    | `strconv.FormatBool(true)`              | `"true"`    |
| `ParseFloat`  | 字符串转 `float64` | `strconv.ParseFloat("19.9", 64)`        | `19.9, nil` |
| `FormatFloat` | 浮点数转字符串     | `strconv.FormatFloat(19.9, 'f', 2, 64)` | `"19.90"`   |
| `ParseInt`    | 按进制解析整数     | `strconv.ParseInt("ff", 16, 64)`        | `255, nil`  |
| `FormatInt`   | 按进制格式化整数   | `strconv.FormatInt(255, 16)`            | `"ff"`      |

## errors

### Common Functions

| 函数            | 用途                         | 典型示例                              | 返回结果        |
| --------------- | ---------------------------- | ------------------------------------- | --------------- |
| `errors.New`    | 创建固定错误                 | `errors.New("用户名不能为空")`        | `error`         |
| `fmt.Errorf`    | 创建带变量的错误             | `fmt.Errorf("用户 %d 不存在", id)`    | `error`         |
| `%w`            | 包装原始错误                 | `fmt.Errorf("读取配置失败: %w", err)` | 保留原错误      |
| `errors.Is`     | 判断错误链中是否存在某个错误 | `errors.Is(err, os.ErrNotExist)`      | `bool`          |
| `errors.AsType` | 提取指定类型的错误           | `errors.AsType[*fs.PathError](err)`   | 错误值和 `bool` |

### errors.New

创建一条内容固定的错误：

```go
func validateName(name string) error {
	if name == "" {
		return errors.New("用户名不能为空")
	}

	return nil
}
```

### fmt.Errorf

错误信息需要包含变量时，使用 `fmt.Errorf`：

```
func findUser(id int) error {
	return fmt.Errorf("用户 %d 不存在", id)
}
```

### errors.Is

判断错误是不是某个特定错误：

```go
var ErrUserNotFound = errors.New("用户不存在")

func getUser(id int) error {
	if id != 1 {
		return fmt.Errorf("查询用户 %d 失败: %w", id, ErrUserNotFound)
	}

	return nil
}
```

调用：

```go
err := getUser(1001)

if errors.Is(err, ErrUserNotFound) {
	fmt.Println("返回 HTTP 404")
}
```

> 为什么不直接写： `err == os.ErrNotExist`?
>
> 因为 `err` 往往已经被包装过：
>
> `err := fmt.Errorf("读取配置失败: %w", os.ErrNotExist)`
>
> 此时：
>
> ```go
> fmt.Println(err == os.ErrNotExist)         // false
> fmt.Println(errors.Is(err, os.ErrNotExist)) // true
> ```
> errors.Is 会沿着错误链继续查找，因此官方建议判断特定错误时优先使用它，而不是简单的 ==。

### errors.AsType

`errors.Is` 判断错误是不是某个**值**，`errors.AsType` 判断错误是不是某种**类型**。

`AsType` 会遍历错误链，找到类型匹配的错误后返回该错误和 `true`。

```go
package main

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
)

func main() {
	_, err := os.Open("config.json")

	pathErr, ok := errors.AsType[*fs.PathError](err)
	if ok {
		fmt.Println("操作：", pathErr.Op)
		fmt.Println("路径：", pathErr.Path)
		fmt.Println("原因：", pathErr.Err)
	}
}
```

输出类似：

```go
操作： open
路径： config.json
原因： no such file or directory
```

> 为什么不能直接进行类型断言
>
> ```go
> pathErr, ok := err.(*fs.PathError)
> ```
>
> 当 `err` 本身就是 `*fs.PathError` 时，这样可以。
>
> 但如果错误被包装了：
>
>`err = fmt.Errorf("加载配置失败: %w", err)`
>
> 直接类型断言就会失败。
>
> 而 `AsType` 会沿着 `%w` 形成的错误链向内寻找：
>
> `pathErr, ok := errors.AsType[*fs.PathError](err) // true`

---

## time

### Common Functions

| 函数      | 用途               | 典型示例                                           | 返回结果                |
| --------- | ------------------ | -------------------------------------------------- | ----------------------- |
| `Now`     | 获取当前时间       | `time.Now()`                                       | `time.Time`             |
| `Date`    | 创建指定时间       | `time.Date(2026, 7, 24, 20, 30, 0, 0, time.Local)` | `time.Time`             |
| `Format`  | 时间转字符串       | `t.Format("2006-01-02 15:04:05")`                  | `"2026-07-24 20:30:00"` |
| `Parse`   | 字符串转时间       | `time.Parse("2006-01-02", "2026-07-24")`           | `time.Time, error`      |
| `Add`     | 增加时间间隔       | `t.Add(2 * time.Hour)`                             | 两小时后的时间          |
| `AddDate` | 增加年月日         | `t.AddDate(0, 0, 7)`                               | 七天后的时间            |
| `Sub`     | 计算时间差         | `end.Sub(start)`                                   | `time.Duration`         |
| `Before`  | 是否早于另一时间   | `start.Before(end)`                                | `true`                  |
| `After`   | 是否晚于另一时间   | `end.After(start)`                                 | `true`                  |
| `Unix`    | 获取 Unix 时间戳   | `t.Unix()`                                         | `int64`                 |
| `Sleep`   | 暂停当前 goroutine | `time.Sleep(time.Second)`                          | 无返回值                |

### Now

`now := time.Now()`

> 类型为：
> `time.Time`

获取常用字段：

```go
now := time.Now()

fmt.Println(now.Year())
fmt.Println(now.Month())
fmt.Println(now.Day())
fmt.Println(now.Hour())
```

### Date

创建一个确定的时间：

```go
t := time.Date(
	2026, time.July, 24,
	20, 30, 0, 0,
	time.Local,
)
```

参数顺序：

`time.Date(年, 月, 日, 时, 分, 秒, 纳秒, 时区)`

### Format

将 `time.Time` 转换成字符串：

```
t := time.Date(
	2026, time.July, 24,
	20, 30, 45, 0,
	time.Local,
)

text := t.Format("2006-01-02 15:04:05")

fmt.Println(text)	// 输出：2026-07-24 20:30:45
```

> Go 的时间格式不是 `YYYY-MM-DD`，而是使用固定参考时间：`2006-01-02 15:04:05`

### Parse

将字符串解析成 `time.Time`：

```go
t, err := time.Parse("2006-01-02", "2026-07-24")
if err != nil {
	fmt.Println("日期格式错误")
	return
}

fmt.Println(t.Year())		// 2026
fmt.Println(t.Month())	// July
fmt.Println(t.Day())		// 24
```

> 格式必须和输入对应：
>```go
>time.Parse("2006-01-02", "2026-07-24") // 正确
time.Parse("2006/01/02", "2026-07-24") // 失败

### Add

在时间上增加或减少一段时间：

```go
t := time.Date(2026, time.July, 24, 20, 0, 0, 0, time.UTC)

later := t.Add(2 * time.Hour)
earlier := t.Add(-30 * time.Minute)

fmt.Println(later.Format("15:04"))		// 22:00
fmt.Println(earlier.Format("15:04"))	// 19:30
```

### AddDate

按照年、月和日计算：

```go
t := time.Date(2026, time.July, 24, 0, 0, 0, 0, time.UTC)

nextWeek := t.AddDate(0, 0, 7)
nextMonth := t.AddDate(0, 1, 0)
nextYear := t.AddDate(1, 0, 0)

fmt.Println(nextWeek.Format("2006-01-02"))		// 2026-07-31
fmt.Println(nextMonth.Format("2006-01-02"))		// 2026-08-24
fmt.Println(nextYear.Format("2006-01-02"))		// 2027-07-24
```

### Sub、Since

计算两个时间之间的间隔：

```go
start := time.Date(2026, 7, 24, 10, 0, 0, 0, time.UTC)
end := time.Date(2026, 7, 24, 12, 30, 0, 0, time.UTC)

duration := end.Sub(start)

fmt.Println(duration)								// 2h30m0s
fmt.Println(duration.Hours())				// 2.5
fmt.Println(duration.Minutes())			// 150
```

统计程序耗时：

```go
start := time.Now()

fmt.Println("耗时：", time.Since(start))
```

### Before、After、Equal

比较两个时间：

```go
start := time.Date(2026, 7, 24, 10, 0, 0, 0, time.UTC)
end := time.Date(2026, 7, 24, 12, 0, 0, 0, time.UTC)

fmt.Println(start.Before(end))		// true
fmt.Println(end.After(start))			// true
fmt.Println(start.Equal(end))			// false
```

### Sleep

暂停当前 goroutine：

```go
time.Sleep(2 * time.Second)
```

### Ticker

按固定间隔重复执行任务：

```go
ticker := time.NewTicker(time.Second)
defer ticker.Stop()

for i := 0; i < 3; i++ {
	<-ticker.C
	fmt.Println("执行任务")
}
```

> `ticker.C` 是一个通道，每到指定间隔便可以从中接收时间值。

### Unix

获取和解析 Unix 时间戳：

```go
t := time.Now()
sec := t.Unix()      // 秒级时间戳，int64
milli := t.UnixMilli()  // 毫秒级时间戳
nano := t.UnixNano()    // 纳秒级时间戳

fmt.Println(sec)     // 输出：1785010245
```

反过来，从时间戳还原成 `time.Time`：

go

```go
t := time.Unix(1785010245, 0)  // 参数：秒, 纳秒
fmt.Println(t)  // 输出：2026-07-24 20:30:45 +0800 CST
```

> Unix 时间戳统一以 UTC 为基准计算（自 1970-01-01 00:00:00 UTC 起的秒数），但 `time.Unix()` 还原出的 `time.Time` 默认使用本地时区展示。

------

## slices

### Common Functions

| 函数          | 用途                 | 典型示例                                     | 结果            |
| ------------- | -------------------- | -------------------------------------------- | --------------- |
| `Contains`    | 判断是否包含元素     | `slices.Contains([]int{1, 2, 3}, 2)`         | `true`          |
| `Index`       | 查找元素下标         | `slices.Index([]string{"Go", "Gin"}, "Gin")` | `1`             |
| `Clone`       | 复制切片             | `copy := slices.Clone(nums)`                 | 独立切片        |
| `Equal`       | 判断两个切片是否相同 | `slices.Equal(a, b)`                         | `bool`          |
| `Delete`      | 删除指定范围         | `slices.Delete(nums, 1, 2)`                  | 删除下标 `1`    |
| `DeleteFunc`  | 按条件删除           | `slices.DeleteFunc(nums, isEven)`            | 删除所有偶数    |
| `Insert`      | 在指定位置插入       | `slices.Insert(nums, 1, 9)`                  | 在下标 `1` 插入 |
| `Sort`        | 升序排序             | `slices.Sort(nums)`                          | 修改原切片      |
| `SortFunc`    | 自定义排序           | `slices.SortFunc(users, cmp)`                | 修改原切片      |
| `Reverse`     | 反转切片             | `slices.Reverse(nums)`                       | 修改原切片      |
| `Min` / `Max` | 获取最小值或最大值   | `slices.Max(nums)`                           | 最大元素        |
| `Compact`     | 删除连续重复元素     | `slices.Compact(nums)`                       | 连续元素去重    |

### Contains

判断切片中是否存在指定元素：

```go
roles := []string{"admin", "editor"}

if slices.Contains(roles, "admin") {
	fmt.Println("拥有管理员权限")
}
```

> 若存在返回true，反之返回false

### Index

查找元素第一次出现的下标：

```go
languages := []string{"Go", "Gin", "GORM"}

index := slices.Index(languages, "GORM")

fmt.Println(index)	// 2
```

> 找到返回元素第一次出现的下标。找不到返回-1。

### Clone

浅拷贝一个切片：

```go
original := []int{1, 2, 3}
copied := slices.Clone(original)	// 创建一个新的底层数组

copied[0] = 100

fmt.Println(original)		// [1 2 3]
fmt.Println(copied)			// [100 2 3]
```

此时如果元素内部仍然包含切片、Map 或指针，这些内部数据仍可能被共享。

比如：

```go
type User struct {
	Name string
	Tags []string
}

original := []User{
	{
		Name: "Jasper",
		Tags: []string{"Go", "Gin"},
	},
}

copied := slices.Clone(original)
```
Tags 自己也是一个切片。复制 User 时，复制的是 Tags 的切片描述符。

```txt
original[0].Tags ──┐
                   ├──> ["Go" "Gin"]
copied[0].Tags   ──┘
```

所以修改内部元素仍会互相影响：

```go
copied[0].Tags[0] = "Rust"

fmt.Println(original[0].Tags) // [Rust Gin]
fmt.Println(copied[0].Tags)   // [Rust Gin]
```

解决办法：手动深拷贝

```go
copied := slices.Clone(original)

for i := range copied {
	copied[i].Tags = slices.Clone(original[i].Tags)
}
```

### Equal

判断两个切片的长度和对应元素是否全部相同：

```go
a := []int{1, 2, 3}
b := []int{1, 2, 3}
c := []int{3, 2, 1}

fmt.Println(slices.Equal(a, b))	// true
fmt.Println(slices.Equal(a, c))	// false
```

### Delete

删除切片中指定下标范围的元素：

```go
languages := []string{"Go", "Java", "Python"}

languages = slices.Delete(languages, 1, 2)	// 左闭右开

fmt.Println(languages)	// [Go Python]
```

### DeleteFunc

按条件删除所有符合条件的元素：

```go
nums := []int{1, 2, 3, 4, 5, 6}

nums = slices.DeleteFunc(nums, func(n int) bool {
	return n%2 == 0
})

fmt.Println(nums)	// [1 3 5]
```

判断函数返回 `true`，代表删除该元素。

### Insert

在指定下标前插入元素：

```go
nums := []int{10, 30}

nums = slices.Insert(nums, 1, 15, 18)

fmt.Println(nums)	// [10 15 18 30]
```

### Sort

对整数、字符串等有序类型进行升序排序：

```go
nums := []int{5, 2, 8, 1}

slices.Sort(nums)

fmt.Println(nums)	// [1 2 5 8]
```

> `Sort` 会直接修改原切片，不返回新切片。

降序可以先升序，再反转：

```go
slices.Sort(nums)
slices.Reverse(nums)
```

### SortFunc

不断拿出俩个元素进行比较，决定谁应该放在前面：

```go
import (
	"cmp"
	"slices"
)

type User struct {
	Name string
	Age  int
}

users := []User{
	{Name: "Jasper", Age: 20},
	{Name: "Alice", Age: 18},
	{Name: "Bob", Age: 22},
}

slices.SortFunc(users, func(a, b User) int {
	return cmp.Compare(a.Age, b.Age)	
})

fmt.Println(users)	// [{Alice 18} {Jasper 20} {Bob 22}]
```

> 每次只需要回答一个问题：在最终排好序的结果里，`a` 应该排在 `b` 的前面吗？

- 返回负数：意思是"**a 应该排在 b 前面**"

- 返回正数：意思是"**a 应该排在 b 后面**"

- 返回 `0`：意思是"**a 和 b 谁前谁后无所谓**"（相等）

### Reverse

原地反转切片：

```go
nums := []int{1, 2, 3, 4}

slices.Reverse(nums)

fmt.Println(nums)	// [4 3 2 1]
```

它会修改原切片，不返回结果。

### Min 与 Max

```go
scores := []int{85, 92, 76, 88}

fmt.Println(slices.Min(scores))		// 76
fmt.Println(slices.Max(scores))		// 92
```

> 不能传入空切片，否则会发生 panic

### Compact

删除连续出现的重复元素：

```go
nums := []int{1, 1, 2, 2, 2, 3}

nums = slices.Compact(nums)

fmt.Println(nums)	// [1 2 3]
```

> 只删除**连续重复**

需要对整数切片整体去重时，可以先排序：

```go
nums := []int{3, 1, 2, 1, 3}

slices.Sort(nums)
nums = slices.Compact(nums)

fmt.Println(nums)		// [1 2 3]
```

---

## maps

### Common Functions

| 函数         | 用途                    | 典型示例                            | 结果         |
| ------------ | ----------------------- | ----------------------------------- | ------------ |
| `Clone`      | 复制 Map                | `copied := maps.Clone(original)`    | 得到独立 Map |
| `Copy`       | 将一个 Map 合并到另一个 | `maps.Copy(dst, src)`               | 同名键被覆盖 |
| `Equal`      | 比较键值对是否相同      | `maps.Equal(a, b)`                  | `bool`       |
| `EqualFunc`  | 自定义值的比较方式      | `maps.EqualFunc(a, b, equal)`       | `bool`       |
| `DeleteFunc` | 按条件删除键值对        | `maps.DeleteFunc(m, del)`           | 修改原 Map   |
| `Keys`       | 遍历所有键              | `for key := range maps.Keys(m)`     | 顺序不固定   |
| `Values`     | 遍历所有值              | `for value := range maps.Values(m)` | 顺序不固定   |

### Clone

浅拷贝：新建一个Map，使用普通赋值复制键和值。

```go
original := map[string]int{
	"Go":  90,
	"Gin": 80,
}

copied := maps.Clone(original)
copied["Go"] = 100

fmt.Println(original["Go"])		// 90
fmt.Println(copied["Go"])			// 100
```

> 如果值中包含切片、Map 或指针，内部数据仍可能共享。

### Copy

把 `src` 中的键值对复制到 `dst`：

```go
dst := map[string]int{
	"Go": 80,
}

src := map[string]int{
	"Go":  100,
	"Gin": 90,
}

maps.Copy(dst, src)

fmt.Println(dst)	// map[Go:100 Gin:90]
```

如果两个 Map 存在相同的键，以 `src` 的值为准。它等价于：

```go
for key, value := range src {
	dst[key] = value
}
```

> 典型场景是“默认配置 + 用户配置”

### Equal

判断两个 Map 是否包含完全相同的键值对：

```go
a := map[string]int{
	"Go":  90,
	"Gin": 80,
}

b := map[string]int{
	"Gin": 80,
	"Go":  90,
}

fmt.Println(maps.Equal(a, b))		// true
```

### EqualFunc

自定义相等规则时使用 `EqualFunc`。

例如忽略字符串大小写：

```go
a := map[int]string{
	1: "Go",
}

b := map[int]string{
	1: "GO",
}

equal := maps.EqualFunc(a, b, func(x, y string) bool {
	return strings.EqualFold(x, y)	
})

fmt.Println(equal)	// true
```

值是切片时也需要 `EqualFunc`：

```go
a := map[string][]int{
	"scores": {80, 90},
}

b := map[string][]int{
	"scores": {80, 90},
}

equal := maps.EqualFunc(a, b, func(x, y []int) bool {
	return slices.Equal(x, y)
})

fmt.Println(equal)	// true
```

### DeleteFunc

按条件删除键值对：

```go
scores := map[string]int{
	"Alice":  95,
	"Bob":    58,
	"Jasper": 88,
}

maps.DeleteFunc(scores, func(name string, score int) bool {
	return score < 60
})

fmt.Println(scores)		// map[Alice:95 Jasper:88]
```

判断函数的含义：

```go
func(key, value) bool {
	return true  // 删除
	return false // 保留
}
```

> `DeleteFunc` 直接修改原 Map，不需要接收返回值。

## os

### Common Functions

| 函数                         | 用途                     | 典型示例                             | 返回结果/输出               |
| ---------------------------- | ------------------------ | ------------------------------------ | --------------------------- |
| `os.ReadFile`                | 一次读入整个文件         | `os.ReadFile("config.yaml")`         | `([]byte, error)`           |
| `os.WriteFile`               | 覆盖写入，不存在则创建   | `os.WriteFile("a.txt", data, 0644)`  | `error`                     |
| `os.OpenFile`                | 自定义模式打开（追加等） | `os.OpenFile("app.log", flag, 0644)` | `(*os.File, error)`         |
| `os.MkdirAll`                | 递归创建多级目录         | `os.MkdirAll("data/logs", 0755)`     | `error`（已存在也返回 nil） |
| `os.Stat`                    | 查文件信息 / 判断存在    | `os.Stat("a.txt")`                   | `(os.FileInfo, error)`      |
| `os.ReadDir`                 | 列出目录内容             | `os.ReadDir("uploads")`              | `([]os.DirEntry, error)`    |
| `os.Rename`                  | 改名 / 移动              | `os.Rename("a.tmp", "a.txt")`        | `error`                     |
| `os.Remove` / `os.RemoveAll` | 删单个 / 递归删除        | `os.RemoveAll("tmp")`                | `error`                     |
| `os.Getenv` / `os.LookupEnv` | 读环境变量               | `os.LookupEnv("PORT")`               | `string` / `(string, bool)` |
| `os.Args`                    | 命令行参数               | `os.Args[1]`                         | `[]string`                  |

### ReadFile

一次性把整个文件读进内存，最常用来读配置。

```go
data, err := os.ReadFile("config.yaml")
if err != nil {
    log.Fatal(err)
}
fmt.Println(string(data))
```

输出（假设 config.yaml 内容就是这两行）：

text

```go
port: 8080
db: dev
```

> 返回的是 `[]byte`，处理文本要先 `string(data)`。整个文件都会进内存，只适合中小文件。

### WriteFile

一次性写入：文件不存在则创建，**已存在则清空重写**。

```go
report := []byte("总用户数: 1024\n活跃用户: 87\n")
if err := os.WriteFile("report.txt", report, 0644); err != nil {
    log.Fatal(err)
}
```

执行后 report.txt 的内容变为：

```text
总用户数: 1024
活跃用户: 87
```

> `0644` 是八进制权限：所有者可读写，其他人只读；目录惯用 `0755`（多了“可进入”权限）。

### OpenFile

`WriteFile` 只会覆盖，想在文件末尾追加（典型是写日志）必须用 `OpenFile` 组合 flag。

```go
f, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
if err != nil {
    log.Fatal(err)
}
defer f.Close()

if _, err := f.WriteString("user=1001 action=login ok\n"); err != nil {
    log.Fatal(err)
}
```

| Flag          | 组别     | 作用                                     |
| ------------- | -------- | ---------------------------------------- |
| `os.O_RDONLY` | 访问模式 | 只读                                     |
| `os.O_WRONLY` | 访问模式 | 只写                                     |
| `os.O_RDWR`   | 访问模式 | 可读可写                                 |
| `os.O_CREATE` | 行为开关 | 不存在就创建                             |
| `os.O_TRUNC`  | 行为开关 | 打开时把文件清空为 0 字节                |
| `os.O_APPEND` | 行为开关 | 每次写自动落到文件末尾                   |
| `os.O_EXCL`   | 行为开关 | 配合 `O_CREATE`：文件已存在则直接报错    |
| `os.O_SYNC`   | 行为开关 | 每次写同步刷进磁盘，极少用（性能代价大） |

### MkdirAll

一次建好整条目录路径，已存在直接返回 nil。

```go
if err := os.MkdirAll("data/uploads/2026-07", 0755); err != nil {
    log.Fatal(err)
}
```

> 因为“已存在不报错”，它适合放在服务启动时无脑执行，确保日志目录、上传目录一定存在。对比：`os.Mkdir` 只能建一层，父目录不存在会直接报错，实战里基本只用 `MkdirAll`。

### Stat

判断文件是否存在

```go
info, err := os.Stat("config.yaml")
if errors.Is(err, os.ErrNotExist) {
    fmt.Println("配置不存在，使用默认配置")
    return
}
if err != nil {
    log.Fatal(err)
}
```

### ReadDir

列出目录里的条目。

假设磁盘结构：

```text
data/uploads/
├── avatar.png
├── docs/
│   └── resume.pdf
└── report.pdf
```

```go
entries, err := os.ReadDir("data/uploads")
if err != nil {
    log.Fatal(err)
}
fmt.Println("条目数:", len(entries))
for _, e := range entries {
    fmt.Println(e.Name(), e.IsDir())
}
```

输出：

```text
条目数: 3
avatar.png false
docs true
report.pdf false
```

| 方法        | 返回值                 | 说明                           |
| ----------- | ---------------------- | ------------------------------ |
| `e.Name()`  | `string`               | 纯文件名，**不带路径**         |
| `e.IsDir()` | `bool`                 | 是否是子目录                   |
| `e.Info()`  | `(os.FileInfo, error)` | 详情：`Size()`、`ModTime()` 等 |

### os.Rename / os.Remove / os.RemoveAll

```go
// 实战模式：先写临时文件，成功后再改名成正式文件
if err := os.Rename("report.tmp", "report.txt"); err != nil {
    log.Fatal(err)
}
if err := os.Remove("old.txt"); err != nil { // 单个文件或空目录
    log.Fatal(err)
}
if err := os.RemoveAll("data/tmp"); err != nil { // 目录连同内容整个删掉
    log.Fatal(err)
}
```

输出：程序无输出；效果是 report.tmp 变成 report.txt，old.txt 与 data/tmp 被删除。

### Getenv / LookupEnv

终端设置：

```
export PORT=8080
```

Go 中读取：

```go
port := os.Getenv("PORT")
```

 `Getenv` 无法区分：

- 变量不存在
- 变量存在，但值为空


需要区分时使用 `LookupEnv`：

```go
port, ok := os.LookupEnv("PORT")
if !ok {
	port = "8080"
}

fmt.Println(port)
```

`LookupEnv` 的第二个返回值表示环境变量是否存在，即使变量的值是空字符串，也会返回 `true`。

### Args

终端里的一行命令按空格切段，程序启动后在 `os.Args`（`[]string`）里原样拿到：

```text
app.exe config.yaml 8080
│       │           │
│       │           └─ os.Args[2] = "8080"
│       └─ os.Args[1] = "config.yaml"
└─ os.Args[0] = 程序本身
```

```go
fmt.Printf("%q\n", os.Args)
// go run . hello world 的输出：
// ["/tmp/go-build.../main" "hello" "world"]
```

典型写法：先查 `len` 再取参数，出错用非零码退出：

```go
if len(os.Args) < 2 {
	fmt.Println("请提供用户名")
	os.Exit(1) // 退出码非 0，外部脚本能感知失败
}
fmt.Println("Hello,", os.Args[1])
// go run . Jasper 的输出：Hello, Jasper
```

> `os.Args[0]` 是程序自身（`go run` 时为临时构建路径，内容不固定），真参数从 `[1]` 开始；不查 `len` 直接取 `[1]`，无参数时会 panic。
>
> 参数全是 `string`：`"8080"` 要 `strconv.Atoi` 才能当数字。
>
> `os.Exit` 立即结束进程，**所有 defer 不执行**；复杂参数交给 `flag` 包，不手动解析。

## path/filepath

`path/filepath` 用于处理**本地文件系统路径**，会自动适配当前操作系统的路径分隔符。WSL/Linux 使用 `/`，Windows 原生环境通常使用 `\`。

> 处理 URL 路径时不要用它，应使用 `path` 或 `net/url`。

以下输出按WSL/Linux 环境展示。

### Common Functions

| 函数      | 用途                         | 典型示例                           | 结果              |
| --------- | ---------------------------- | ---------------------------------- | ----------------- |
| `Join`    | 拼接路径                     | `Join("config", "app.yaml")`       | `config/app.yaml` |
| `Base`    | 获取文件名                   | `Base("/app/config.yaml")`         | `config.yaml`     |
| `Dir`     | 获取所在目录                 | `Dir("/app/config.yaml")`          | `/app`            |
| `Ext`     | 获取扩展名                   | `Ext("app.prod.yaml")`             | `.yaml`           |
| `Clean`   | 清理多余的 `.`、`..`、分隔符 | `Clean("a//b/../c")`               | `a/c`             |
| `Abs`     | 转为绝对路径                 | `Abs("config/app.yaml")`           | 取决于当前目录    |
| `Rel`     | 计算相对路径                 | `Rel("/app", "/app/static/a.png")` | `static/a.png`    |
| `WalkDir` | 递归遍历目录                 | 遍历配置文件                       | 每个文件和目录    |

### Join

因为不同系统的分隔符不同，不要手动写 `"storage/" + filename`。

`Join` 会使用当前系统的分隔符，并自动清理路径。

```go
package main

import (
	"fmt"
	"path/filepath"
)

func main() {
	configPath := filepath.Join("config", "app.yaml")
	logPath := filepath.Join("storage", "logs", "app.log")

	fmt.Println(configPath)		// config/app.yaml
	fmt.Println(logPath)			// storage/logs/app.log
}
```

### Base、Dir、Ext

- Base：获取路径最后一部分，通常是文件名。

- Dir：获取所在目录。

- Ext：获取扩展名，包含 `.`。
> Ext 只识别最后一个扩展名，`app.tar.gz` 返回 `.gz`
>
> 没有扩展名时返回空字符串

```go
package main

import (
	"fmt"
	"path/filepath"
	"strings"
)

func main() {
	path := "/srv/app/config/app.prod.yaml"

	filename := filepath.Base(path)
	dir := filepath.Dir(path)
	ext := filepath.Ext(path)
	name := strings.TrimSuffix(filename, ext)
	// 从 app.prod.yaml 末尾删除 .yaml，得到 app.prod
  
	fmt.Println(filename)		// app.prod.yaml
	fmt.Println(dir)				// /srv/app/config
	fmt.Println(ext)				// .yaml
	fmt.Println(name)				// app.prod
}
```

### Clean、Abs、Rel

- `Clean`：整理路径，删除多余的分隔符、`.`，并处理可以抵消的 `目录/..`。
- `Abs`：将路径转换为绝对路径。相对路径会以程序的当前工作目录为基础。
- `Rel`：计算从基础路径前往目标路径所需的相对路径。

> `Clean` 只处理路径字符串，不检查文件或目录是否真实存在。
>
> `Abs` 会自动对结果执行 `Clean`，返回值需要处理 `error`。
>
> `Rel(basePath, targetPath)` 的参数顺序是“基础路径、目标路径”，结果中可能出现 `..`。

```go
package main

import (
	"fmt"
	"path/filepath"
)

func main() {
	cleanPath := filepath.Clean(
		"storage//logs/../data/./users.json",
	)

	absPath, err := filepath.Abs("config/app.yaml")
	if err != nil {
		fmt.Println("获取绝对路径失败：", err)
		return
	}

	relPath, err := filepath.Rel(
		"/srv/app/config",
		"/srv/app/static/avatar.png",
	)
	if err != nil {
		fmt.Println("计算相对路径失败：", err)
		return
	}

	fmt.Println(cleanPath) // storage/data/users.json
	fmt.Println(absPath)   // 当前工作目录/config/app.yaml
	fmt.Println(relPath)   // ../static/avatar.png
}
```

### WalkDir

- `WalkDir`：从指定根目录开始，递归访问其中的每个目录和文件。
- 每访问一个路径，就执行一次你传入的回调函数。

```
filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
	// 处理当前文件或目录
	return nil
})
```

回调函数的三个参数：

- `path`：当前文件或目录的完整路径。
- `d`：当前路径的信息，可以判断它是文件还是目录、获取名称等。
- `err`：访问当前路径时发生的错误。

> `WalkDir` 也会访问传入的根目录本身。
>
> `d.IsDir()` 用于判断当前路径是否为目录。
>
> 回调返回 `nil` 表示继续遍历；返回普通错误会立即终止遍历。
>
> `WalkDir` 默认不会进入符号链接指向的目录。

假设目录结构如下：

```
configs/
├── app.yaml
├── dev.yaml
├── readme.txt
└── production/
    └── app.yaml
```

查找所有 `.yaml` 文件：

```go
package main

import (
	"fmt"
	"io/fs"
	"path/filepath"
)

func main() {
	err := filepath.WalkDir(
		"configs",
		func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}

      // 目录不处理，但仍然继续进入目录内部
			if d.IsDir() {
				return nil
			}

			if filepath.Ext(path) == ".yaml" {
				fmt.Println(path)
			}

			return nil
		},
	)
	if err != nil {
		fmt.Println("遍历失败：", err)
	}
}
```

输出：

```go
configs/app.yaml
configs/dev.yaml
configs/production/app.yaml
```

## io

### Reader 与 Writer

- `io.Reader`：表示“可以从中读取数据”的对象。
- `io.Writer`：表示“可以向其中写入数据”的对象。

它们本质上是两个接口：

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}
```

常见实现：

```
*os.File       既可以是 Reader，也可以是 Writer
*http.Response.Body  是 Reader
*bytes.Buffer  既可以是 Reader，也可以是 Writer
strings.Reader 是 Reader
```

正因为函数接收的是接口，而不是具体类型，所以同一个 `io.Copy` 既能复制文件，也能复制 HTTP 数据或内存中的数据。

## log/slog

> 还能向上返回的错误，使用 fmt.Errorf 增加上下文；已经在当前层最终处理的错误，再使用 slog 记录。

一条日志通常由：`时间 + 日志级别 + 消息 + 属性`组成。

例如：

```go
slog.Info("server started", "port", 8080)
```

输出类似：

```txt
time=2026-08-24T06:30:00.000+08:00 level=INFO msg="server started" port=8080
```

其中：

```txt
"server started"  → 日志消息
"port"            → 属性名
8080              → 属性值
```

### Common Functions

| 函数 / 类型      | 用途                     | 典型示例                                       |
| ---------------- | ------------------------ | ---------------------------------------------- |
| `Debug`          | 调试日志                 | `slog.Debug("config loaded")`                  |
| `Info`           | 普通运行日志             | `slog.Info("server started")`                  |
| `Warn`           | 警告日志                 | `slog.Warn("redis reconnecting")`              |
| `Error`          | 错误日志                 | `slog.Error("query failed", "error", err)`     |
| `New`            | 创建 Logger              | `slog.New(handler)`                            |
| `NewTextHandler` | 创建文本 Handler         | `slog.NewTextHandler(os.Stdout, nil)`          |
| `NewJSONHandler` | 创建 JSON Handler        | `slog.NewJSONHandler(os.Stdout, nil)`          |
| `Logger.With`    | 给后续日志附加固定属性   | `logger.With("service", "api")`                |
| `SetDefault`     | 设置全局默认 Logger      | `slog.SetDefault(logger)`                      |
| `HandlerOptions` | 配置日志级别、源码位置等 | `&slog.HandlerOptions{Level: slog.LevelDebug}` |

### Logger 与 Handler

`slog` 主要由两个部分组成：

```txt
Logger
  │
  │ 产生日志
  ▼
Handler
  │
  │ 决定怎样输出
  ▼
终端 / 文件 / 日志系统
```

```go
handler := slog.NewTextHandler(os.Stdout, nil)	// 创建文本Handler

logger := slog.New(handler)	// 创建Logger

logger = logger.With(
	"service", "go-web-template",
	"env", "development",
)														
// With 返回一个新的 Logger，并给之后所有日志自动添加固定属性键值对

logger.Info("server started", "port", 8080)
// level=INFO msg="server started" service=go-web-template env=development port=8080

slog.SetDefault(logger)	// 设置为全局默认 Logger，以后无需传logger
```

> 自己创建它们的目的，就是把 `slog` 从“能打印日志”，变成“符合 项目要求的日志系统”

### HandlerOptions

`HandlerOptions` 的意义主要是让你**统一控制整个项目到底输出哪些日志**

创建 Handler 时可以传入配置：

```go
handler := slog.NewTextHandler(
	os.Stdout,
	&slog.HandlerOptions{
		Level:     slog.LevelDebug,
		AddSource: true,
	},
)
```

`Level` 指定最低允许输出什么级别的日志。

例如：

```
Level: slog.LevelWarn
```

此时：

```
Debug  ×
Info   ×
Warn   √
Error  √
```

如果不指定则默认最低级别：

```
slog.NewTextHandler(os.Stdout, nil)	// slog.LevelInfo
```

`AddSource` 用于记录日志代码所在位置：

```
AddSource: true
```

输出类似：

```
source=/app/main.go:25
```

### UnmarshalText

把字符串形式的日志级别解析成 `slog.Level`

`func (l *Level) UnmarshalText(data []byte) error`

```go
var level slog.Level

if err := level.UnmarshalText([]byte(cfg.Level)); err != nil {
	return nil, fmt.Errorf("parse log level %q: %w", cfg.Level, err)
}
```

转换过程：

```
"debug"
   ↓
UnmarshalText
   ↓
slog.LevelDebug
```

并且忽略大小写。

> `UnmarshalText` 会直接修改 `level`，因此不需要接收转换后的返回值。

## uuid

### Common Functions

| 函数 / 方法 | 用途                             | 典型示例               | 返回结果             |
| ----------- | -------------------------------- | ---------------------- | -------------------- |
| `New`       | 生成通用 UUID，目前等价于 UUIDv4 | `uuid.New()`           | `uuid.UUID`          |
| `NewV4`     | 生成随机 UUIDv4                  | `uuid.NewV4()`         | `uuid.UUID`          |
| `NewV7`     | 生成按时间排序的 UUIDv7          | `uuid.NewV7()`         | `uuid.UUID`          |
| `Parse`     | 字符串解析成 UUID                | `uuid.Parse(text)`     | `(uuid.UUID, error)` |
| `MustParse` | 解析 UUID，失败直接 panic        | `uuid.MustParse(text)` | `uuid.UUID`          |
| `String`    | UUID 转字符串                    | `id.String()`          | `string`             |
| `Compare`   | 比较两个 UUID 的顺序             | `a.Compare(b)`         | `int`                |
| `Nil`       | 获取全零 UUID                    | `uuid.Nil()`           | `uuid.UUID`          |

### Parse

将字符串解析成 `uuid.UUID`：

```go
text := "019c1234-5678-7abc-8def-0123456789ab"

id, err := uuid.Parse(text)
if err != nil {
	fmt.Println("UUID 格式错误")
	return
}

fmt.Println(id)
```

处理用户输入、URL 参数、请求参数时应该使用 `Parse`：

```go
id, err := uuid.Parse(c.Param("id"))
if err != nil {
	// 返回参数格式错误
}
```

因为外部传入的字符串不能保证一定合法。

### MustParse

`MustParse` 同样把字符串转换成 UUID：

```go
id := uuid.MustParse(
	"019c1234-5678-7abc-8def-0123456789ab",
)
```

区别是解析失败时不会返回 `error`，而是直接 panic。

因此适合已经确定合法的固定值：

```go
var systemID = uuid.MustParse(
	"019c1234-5678-7abc-8def-0123456789ab",
)
```

不要这样处理用户输入：

```go
id := uuid.MustParse(c.Param("id"))
```

因为用户只要传入：

```text
abc
```

程序就可能 panic。

简单记：

```text
外部输入        → Parse
程序内固定 UUID → MustParse
```

### Nil

UUID 也存在“零值 UUID”：

```go
nilID := uuid.Nil()

fmt.Println(nilID)
```

输出：

```text
00000000-0000-0000-0000-000000000000
```

 `uuid.UUID` 本质是数组，所以可以直接使用 `==` 比较：

```go
id := uuid.Nil()

if id == uuid.Nil() {
	fmt.Println("UUID 为空")
}
```

### Compare

比较两个 UUID 的排序：

```go
a := uuid.NewV7()
b := uuid.NewV7()

result := a.Compare(b)
```

返回规则：

```text
-1    a 在 b 前面
 0    a 和 b 相同
+1    a 在 b 后面
```

例如：

```go
if a.Compare(b) < 0 {
	fmt.Println("a 排在 b 前面")
}
```

对于 UUIDv7，这个排序通常具有实际意义，因为 UUID 中包含时间信息。

### 工程常见用法

例如创建用户：

```go
type User struct {
	ID   uuid.UUID
	Name string
}

func NewUser(name string) User {
	return User{
		ID:   uuid.NewV7(),
		Name: name,
	}
}
```

调用：

```go
user := NewUser("Jasper")

fmt.Println(user.ID)
```

整个过程：

```text
创建用户
   ↓
uuid.NewV7()
   ↓
生成 128 位业务 ID
   ↓
保存到数据库
   ↓
API / 日志中使用字符串形式展示
```

如果只是需要随机唯一标识：

```go
uuid.New()
```

如果明确作为数据库中的业务 ID：

```go
uuid.NewV7()
```

如果解析外部传进来的 UUID：

```go
uuid.Parse(text)
```

这三个基本覆盖 Go Web 项目里绝大多数 UUID 使用场景。
