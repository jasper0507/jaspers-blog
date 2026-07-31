---
title: "Go语言笔记(长期更新)"
description: "这是一篇用于记录Go语言基础语法的个人笔记。"
publishedAt: 2026-01-23T18:18:37+08:00
updatedAt: 2026-01-23T18:18:37+08:00
tags:
  - "后端开发"
  - "语言基础"
  - "学习笔记"
  - "Go"
draft: false
---
## Go语言学习笔记

### 一、基础语法
#### 1. 自动分号规则
Go语言每行后自动加分号。

#### 2. 变量与包的使用要求
定义的变量和import的包必须使用。

#### 3. Go语言代码风格
正确示例：
```go
package main
import "fmt"
func main(){
    fmt.Println("hello,word!")
}
```
> 这是正确的

错误示例：
```go
package main
import "fmt"
func main()
{
    fmt.Println("hello,word!")
}
```
> 这是错误的

#### 4. 变量声明的三种方式
- 指定变量类型，声明后若不赋值，使用默认值（int是0，string是空字符串）
```go
package main
import "fmt"
func main(){
    var i int
    fmt.Println("i=",i);
}
```

- 类型推导
```go
package main
import "fmt"
func main(){
    var i = 10.11
    fmt.Println("i=",i);
}
```

- 省略var的声明
```go
package main
import "fmt"
func main(){
    i :="hello"
    fmt.Println("i=",i);
}
```

- 多变量声明
```go
var (
    n1=100
    n2=10.11
    n3="hello"
)
```

#### 5. +号的使用规则
- 当左右两边都是数值型时，做加法运算
- 当左右两边都是字符串时，做字符串拼接

#### 6. 数据类型基本介绍
| 数据类型大类 | 具体类型                | 简要基础说明                                                                 |
|--------------|-------------------------|------------------------------------------------------------------------------|
| 基本数据类型 | 布尔型（bool）          | 仅有`true`和`false`两个值，用于条件判断，不支持与整数转换                     |
| 基本数据类型 | 整数型（int/uint/int8等）| 存储整数，分有符号/无符号、不同位数，`int`为跨平台默认推荐，`byte`是`uint8`别名 |
| 基本数据类型 | 浮点数型（float32/float64） | 存储小数，`float64`为默认类型，存在精度丢失问题，高精度计算需借助第三方库       |
| 基本数据类型 | 字符串型（string）      | 存储文本，UTF-8编码，天然支持多字节字符，创建后不可修改                       |
| 基本数据类型 | 字符型（rune）          | `int32`的别名，用于存储Unicode字符（如中文），解决多字节字符存储问题           |
| 复合数据类型 | 数组（array）           | 固定长度的同类型数据集合，值类型，赋值/传参会拷贝整个数组                     |
| 复合数据类型 | 切片（slice）           | 可变长度的同类型数据集合，引用类型，底层基于数组，日常开发优先使用             |
| 复合数据类型 | 映射（map）             | 键值对集合，键唯一且无序，引用类型，用于存储关联数据（如用户配置）             |
| 复合数据类型 | 结构体（struct）        | 自定义复合类型，可封装不同类型的字段，用于构建数据模型（如用户、订单）         |
| 复合数据类型 | 指针（pointer）         | 存储变量内存地址，引用类型，可修改变量原始值、优化大数据传参性能               |
| 复合数据类型 | 函数（function）        | 可执行代码块，支持作为变量/参数/返回值，用于封装可复用逻辑                     |
| 复合数据类型 | 接口（interface）       | 定义方法集合，支持多态，无需显式实现，用于代码解耦和抽象化设计                 |
| 复合数据类型 | 通道（channel）         | 协程间通信的管道，引用类型，自带并发安全，用于协程间传递数据                   |

#### 7. 整数类型
|类型|有无符号|占用存储空间|表数范围|备注|
|:---:|:---:|:---:|:---:|:---:|
|int8|有|1字节|-128~127||
|int16|有|2字节|-2^15^~2^15^-1||
|int32|有|4字节|-2^31^~2^31^-1||
|int64|有|8字节|-2^63^~2^63^-1||
|uint8|无|1字节|0~255||
|uint16|无|2字节|0~2^16^-1||
|uint32|无|4字节|0~2^32^-1||
|uint64|无|8字节|0~2^64^-1||
|int|有|8字节|-2^63^~2^63^-1||
|uint|无|8字节|0~2^64^-1||
|rune|有|与int32等价|-2^31^~2^31^-1|等价int32，表示一个Unicode码|
|byte|无|与uint8等价|0~255|存储字符|

#### 8. 小数类型
|类型|占用存储空间|表数范围|
|:---:|:---:|:---:|
|单精度float32|4字节|-3.403E38~3.403E38|
|双精度float64|8字节|-1.798E308~1.798E308|

#### 9. 字符类型
- 存储单个字符用byte保存
> go语言中没有char类型

- go的字符串是由字节组成的，是一段不可变的字符序列
```go
var str="hello"
str[0]='a'
```
> 这是错的

- 反引号`，以字符串的原生形式输出，包括换行和特殊字符
```go
package main
import "fmt"
func main(){
    i:=`
package main
import "fmt"
func main(){
    var i = 10.11
    fmt.Println("i=",i);
}
`
    fmt.Println(i);
}
```

- 当一行字符串太长时，需要用到多行字符串时
```go
str:="hello "+"word"+
"hello "+"word"+
"hello "  
```

#### 10. 基础数据类型的相互转换
##### 10.1 基本类型间转换
```go
var i int32 = 100
var n1 float32 = float32(i)
```

##### 10.2 转换为string类型
1. fmt.Sprintf("%参数",表达式)
2. 使用strconv包函数
```go
var num1 int = 99
var num2 float64 = 23.4
var b1 bool = true
str1 = strconv.FormatInt(int64(num1),10)
str1 = strconv.Itoa(num1)
//这里的10表示十进制，想转几进制就写几
str2 = strconv.FormatFloat(num2,'f',2,64)
//一般用'f'控制输出，如果是'e'就按科学计数法输出。
//2指的是保留二位小数
//64表示float64
str3 = strconv.FormatBool(b1)
```

##### 10.3 string类型转基本数据类型
```go
var str string = "true"
var b bool
var num int64
b,_ = strconv.ParseBool(str)
//这个函数会返回俩个值(value bool,err error),因为不想获取err，使用_忽略
str = "11"
num,_ = strconv.ParseInt(str,10,64)
```

#### 11. 运算符特性
在go中，a++属于一条单独的语句，不属于运算符，没有++a，只有a++

#### 12. 流程控制
##### 12.1 基本特性
- go语言中没有while，{}不能省略
- 相较于c语言省略了（）

##### 12.2 if语句的使用和注意事项
```go
if 初始化语句; 条件表达式 {
    // 执行逻辑
}
//注意，如果使用else 必须紧跟 if 的大括号，否则会因 Go 的自动分号插入规则导致编译错误。
```

##### 12.3 for range的使用
```go
// 遍历 map
user := map[string]string{
    "name": "张三",
    "age":  "20",
    "city": "北京",
}
// 同时获取键和值
for key, value := range user {
    fmt.Printf("键: %s, 值: %s\n", key, value)
}
// 只需要值（忽略键）
for _, value := range user {
    fmt.Printf("值: %s\n", value)
}
```

##### 12.4 switch case用法（case的值可以是变量）
1. 支持无表达式
```go
score := 85
switch { // 无表达式
case score >= 90:
    fmt.Println("优秀")
case score >= 80:
    fmt.Println("良好") // 输出：良好
case score >= 60:
    fmt.Println("及格")
default:
    fmt.Println("不及格")
}
```

2. 简短变量声明，变量作用域为switch内部
```go
switch num := 10; num % 2 { // 声明变量num，判断其除以2的余数
case 0:
    fmt.Println("偶数") // 输出：偶数
case 1:
    fmt.Println("奇数")
}
```

3. fallthrough 关键字（强制执行下一个 case）
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

4. 支持对接口变量的动态类型进行判断（需配合 .(type) 语法）
```go
func main() {
    var x interface{} = "hello"
    switch v := x.(type) { // 判断x的实际类型
    case int:
        fmt.Printf("是int类型，值为%d\n", v)
    case string:
        fmt.Printf("是string类型，值为%s\n", v) // 输出：是string类型，值为hello
    case bool:
        fmt.Printf("是bool类型，值为%t\n", v)
    default:
        fmt.Println("未知类型")
    }
}
```

##### 12.5 break与标签
```go
outerLoop: // 标记外层循环,标签名自定义
for i := 0; i < 2; i++ {
    for j := 0; j < 2; j++ {
        if i == 1 && j == 1 {
            break outerLoop // 跳出outerLoop标记的外层循环
        }
        fmt.Printf("i=%d, j=%d\n", i, j)
    }
}
```

##### 12.6 continue与标签
```go
outerLoop: // 标记外层循环
for i := 0; i < 3; i++ {
    for j := 0; j < 2; j++ {
        if i == 1 {
            // 当i=1时，跳过outerLoop标记的外层循环的当前迭代（即i=1的整个迭代）
            continue outerLoop 
        }
        fmt.Printf("i=%d, j=%d\n", i, j)
    }
}
```

##### 12.7 goto与标签
```go
// 多层循环嵌套
for i := 0; i < 3; i++ {
    for j := 0; j < 3; j++ {
        fmt.Printf("i=%d, j=%d\n", i, j)
        if i == 1 && j == 1 {
            // 满足条件时，跳转到循环外的exit标签
            goto exit
        }
    }
}

exit: // 循环外的标签
fmt.Println("跳出所有循环")
```

限制:
1. 不能跨函数跳转
2. 不能跳过声明变量
3. 不能跳出当前代码域

|关键字|作用范围|跳转行为|适用场景|
|:---:|:---:|:---:|:---:|
|goto|同一函数内任意标签|无条件跳转到标签处|多层循环退出、统一错误处理|
|break 标签|标签标记的循环/代码块|终止标签标记的结构，退出执行|跳出外层循环或代码块|
|continue 标签|标签标记的循环|跳过标签标记的循环的当前迭代|跳过外层循环的当前迭代|


### 二、数组
#### 1. 数组定义
var 数组变量名 [元素数量]数据类型（var arr [3]int）

#### 2. 数组核心特性
数组长度是类型的一部分（var arr [3]int的类型是[3]int）

#### 3. 数组初始化方式
1. var arr = [3]int{1,2,3} 或 var arr = [...]int{1,2,3}
2. arr := [3]int{1,2,3}
3. arr := [...]int{0:1, 1:23, 2:34, 3:43, 5:53}

#### 4. 值类型与引用类型区别
- 值类型：改变变量副本的值的时候，不会改变变量本身的值（数组）
- 引用类型：改变变量副本的值的时候，会改变变量本身的值（切片）

#### 5. 多维数组
```go
arr1 := [...][2]string{{"北京","上海"},{"广州","深圳"}}
for _,i := range(arr1){
    for _,j := range(i){
        fmt.Println(j)
    }
}
```


### 三、切片
#### 1. 切片本质
Go 的切片本质是对底层数组的 “视图（View）”，是一个包含「指向底层数组的指针、切片长度、切片容量」的小型值类型结构体（slice header）。切片本身不存储数据，所有数据都存放在底层数组中；切片的 “动态扩容”“引用语义” 等特性，都是通过这个结构体操作底层数组实现的。
```go
type sliceHeader struct {
    ptr   *[]byte // 指向底层数组的指针
    len   int     // 切片长度
    cap   int     // 切片容量
}
```
#### 2. 切片声明
var arr = []int{1,2,3} （相比数组不用写数组长度类型，自动推导）
- 声明切片后，初始默认值为nil

#### 3. 切片的创建方式
##### 3.1 基于数组的切片
```go
arr := [5]int {1,2,3,4,5}
b := arr[:] //获取数组里的所有值
c := arr[1:4]  //{2，3，4} 左闭右开
d := arr[2:]  //{3,4,5}
e := arr[:3]  //{1，2，3}
```

##### 3.2 基于切片的切片
```go
a := []int {1,2,3,4}
b := a[:]  //以下操作同上
```

##### 3.3 使用make函数构造切片
var arr = make([]T, size, cap)
- 有默认值，不为nil

#### 4. 切片的长度与容量
1. 长度：它所包含元素的个数，通过len(a)获取
2. 容量：从它第一个元素开始数，一直到其底层数组元素末尾的个数，通过cap(a)获取

#### 5. 切片的常用操作
##### 5.1 用append()函数为切片动态添加元素
每个切片指向一个底层数组，返回值为新切片
- 添加元素
```go
s := []int{10, 20}
s = append(s, 30, 40, 50)
fmt.Println(s) // 输出: [10 20 30 40 50]
```

- 合并俩个切片，需要展开符...
```go
a := []int{1, 2, 3}
b := []int{4, 5, 6}
c := append(a, b...) 
fmt.Println(c) // 输出: [1 2 3 4 5 6]
```

##### 5.2 copy函数复制切片
返回实际复制的元素个数
```go
src := []int{10, 20, 30, 40}
dst := make([]int, 4) 
n := copy(dst, src)   // 复制src到dst
// 或者直接  dst := slices.Clone(src) 
fmt.Println("复制的元素数：", n) // 输出：4
fmt.Println("目标切片：", dst)   // 输出：[10 20 30 40]
```
> slices.Clone()能得到 “独立副本”
slices.Clone()的底层逻辑是：
func Clone[S ~[]E, E any](s S) S {
    // 1. 创建一个新的切片，长度/容量和原切片一致
    newSlice := make(S, len(s), cap(s))
    // 2. 把原切片底层数组的元素**逐个拷贝**到新切片的底层数组
    copy(newSlice, s)
    return newSlice
}
核心是：slices.Clone()会创建新的切片结构体 + 新的底层数组，然后把原底层数组的元素逐个拷贝到新数组中。而直接赋值是拷贝结构体（包括指针），共享底层数组。
切片关键是结构体中的指针元素让他有了共享的能力，而clone会创建一个新切片（新的结构体），故切片的元素是**值类型**时能得到独立副本。
但是如果切片的元素是**引用类型**如map（本质是指向底层哈希表结构体的指针），那么copy的元素是指针类型，所以不能得到独立副本。
***总结：slices.Clone是浅拷贝，主要看元素的类型。***

##### 5.3 删除切片的元素
```go
arr := []int{1,2,3,4}
arr = append(arr[:2], arr[3:]...) //删除索引为2的元素
```

##### 5.4 利用切片改变字符串的字符
```go
str := "hello golang"
s := []byte(str)
s[0] =  'H'
str1 := "你好！"
s1 := []rune(str1)
s1[0] = '雷'
```

#### 6. sort包的使用
##### 6.1 基本类型排序
```go
sort.Ints(a []int) //int切片（升序）
sort.Float64s(a []float64) //float64切片（升序）
sort.Strings(a []string) //string切片（按字典序升序）
slices.Sort()
```

##### 6.2 自定义类型排序
slices.SortFunc()是 Go 1.21 版本新增到slices标准库中的泛型函数，专门用于根据自定义的比较逻辑对切片进行原地排序。它解决了传统sort包中自定义排序需要实现Interface接口的繁琐问题，让自定义排序更简洁、灵活。
函数签名：
```go
func SortFunc[S ~[]E, E any](x S, cmp func(a, b E) int)
```
参数 / 类型约束解释：
- S ~[]E：泛型约束，S是底层类型为[]E的切片类型（~表示 “底层类型匹配”）；
- E any：切片元素可以是任意类型（int、string、结构体等）；
- x S：要排序的切片（原地排序，直接修改原切片，不返回新切片）；
- cmp func(a, b E) int：自定义比较函数，是排序规则的核心，返回值规则：
- 返回 < 0：a 应该排在 b 前面；
- 返回 0：a 和 b 的相对顺序无关（排序后位置随机）；
- 返回 > 0：b 应该排在 a 前面。
举例：
```go
type Person struct {
  Name   string
  Age    int
  Salary float64
}

func main() {
  people := []Person{
    {Name: "Alice", Age: 25, Salary: 5000.0},
    {Name: "Bob", Age: 30, Salary: 6000.0},
    {Name: "Charlie", Age: 28, Salary: 5500.0},
  }

  slices.SortFunc(people, func(p1 Person, p2 Person) int {
    if p1.Name > p2.Name {
      return 1
    } else if p1.Name < p2.Name {
      return -1
    }
    return 0
  })
}
```
sort包
```go
// 非稳定排序：相等元素的相对顺序可能被打乱
func Slice(slice interface{}, less func(i, j int) bool)
// 稳定排序：保留相等元素的原始相对顺序
func SliceStable(slice interface{}, less func(i, j int) bool)
// 示例
sort.Slice(students, func(i, j int) bool {
		if students[i].Score != students[j].Score {
			return students[i].Score > students[j].Score
		}
		return students[i].Age < students[j].Age
	})
```


### 四、map类型
#### 1. map的声明与初始化
##### 1.1 声明（零值为 nil，未分配内存，不能直接写入数据）
var 变量名 map[KeyType]ValueType

##### 1.2 声明并初始化（两种方式）
- 方式A：使用 make 函数（推荐，显式指定容量可优化性能）
变量名 := make(map[KeyType]ValueType, [可选容量])

- 方式B：使用字面量（直接初始化并赋值）
```go
变量名 := map[KeyType]ValueType{
    key1: value1,
    key2: value2,
} 
```
##### 1.3 map的本质
map 本质是基于哈希表（Hash Table）实现的无序键值对集合，属于 “伪引用类型”（底层是指向哈希表管理结构体的**指针**），由 Go 运行时（runtime）的hmap（哈希表管理器）和bmap（桶）两大核心结构体支撑，核心目标是通过哈希函数将 key 映射到固定存储位置，实现 O (1) 级别的增删改查（理想情况）。
map 变量是**指向hmap结构体的指针**（比如var m map[int]string的类型本质是*hmap）；
```go
type hmap struct {
    count     int       // 哈希表中实际存储的键值对总数
    B         uint8     // 桶数组的大小指数（桶数量 = 2^B，比如B=3则有8个桶）
    buckets   unsafe.Pointer // 指向桶数组（bmap数组）的指针
    hash0     uint32    // 哈希种子（随机数，避免哈希碰撞攻击）
    // 其他辅助字段：溢出桶指针、扩容标记、迭代器状态等
}
```

#### 2. map的核心操作
##### 2.1 添加/修改键值对
```go
// 初始化 map
m := make(map[string]int)

// a.添加键值对（key 不存在）
m["Alice"] = 95
m["Bob"] = 88
fmt.Println("添加后:", m) // 输出：map[Alice:95 Bob:88]

// b. 修改键值对（key 已存在）
m["Bob"] = 90 // 覆盖 Bob 的旧值 88
fmt.Println("修改后:", m) // 输出：map[Alice:95 Bob:90]

// c. 错误示例：nil map 写入（会 panic）
var nilMap map[string]int
// nilMap["Charlie"] = 92 // 运行时错误：assignment to entry in nil map
```

##### 2.2 获取值与判断键是否存在
```go
m := map[string]int{
    "Alice": 95,
    "Bob":   90,
}

// a. 获取存在的 key
score1, exists1 := m["Alice"]
// 输出：Alice 的分数：95，key 是否存在：true

// b. 获取不存在的 key（value 为 int 零值 0，exists 为 false）
score2, exists2 := m["Charlie"]

// c. 只获取 value（忽略 exists，不推荐用于判断 key 是否存在）
score3 := m["Bob"]
```

##### 2.3 删除键值对
```go
m := map[string]int{
    "Alice": 95,
    "Bob":   90,
    "Charlie": 85,
}

// a. 删除存在的 key
delete(m, "Bob")

// b. 删除不存在的 key（无效果，不报错）
delete(m, "Dave")
// 输出：map[Alice:95 Charlie:85]

// c. 对 nil map 调用 delete（无效果，不报错）
var nilMap map[string]int
delete(nilMap, "Alice")
```

##### 2.4 获取map长度
a := len(m)

#### 3. map的函数类型定义
在 Go 语言中，只要两个函数的参数列表类型（数量、顺序、具体类型）完全相同，且返回值列表类型（数量、顺序、具体类型）也完全相同，那么这两个函数就属于同一函数类型。


### 五、函数
#### 1. 函数定义
func 函数名(参数) 返回值{函数体}

#### 2. 函数参数的简写
func sum(a int,b int) int{} //可简写为func sum(a,b int) int{}

#### 3. 函数的可变参数
在函数参数列表中，通过在参数类型前添加 ... 来声明可变参数
```go
func 函数名(参数名 ...类型) 返回值类型 {函数体}

//可变参数本质为对应类型的切片
func sum(num ...int) {
    fmt.Println(num)
}

func main() {
    a := []int{1, 2, 3}
    sum(a...)//如果直接传入a会因（[]int与函数参数int类型不匹配而报错）
}
```

#### 4. return返回多个值
```go
func calu(a, b int) (int,int) {
    sum := a + b
    sub := a - b
    return sum, sub
}

func main() {
    a, b := calu(10, 2)
    fmt.Println(a, b)
}
```

#### 5. 返回值命名
```go
func calu(a, b int) (sum, sub int) {
    sum = a + b
    sub = a - b
    return
}

func main() {
    a, b := calu(10, 2)
    fmt.Println(a, b)
}
```
> 细节：命名返回值中，return 操作的是 “返回值载体本身”；非命名返回值中，return 操作的是 “局部变量到临时载体的复制”，返回的是一个副本

#### 6. 自定义函数类型
```go
type add func(int, int) int

func add_func(a int, b int) int {
    return a + b
}

func main() {
    var a add
    a = add_func
    result := a(1, 2)
    fmt.Println(result)
}
```

#### 7. 函数作为函数参数
（基于自定义函数类型实现，可结合上述自定义函数类型示例扩展）


### 六、匿名函数
#### 1. 匿名函数基本定义
```go
func(参数列表) 返回值类型 {
    // 函数体
}
```

#### 2. 匿名函数的使用场景
##### 2.1 定义后立即调用（自执行）
```go
func main() {
    // 定义匿名函数并立即调用（无参数）
    func() {
        fmt.Println("匿名函数被调用了")
    }() 

    // 带参数的匿名函数立即调用
    func(name string) {
        fmt.Printf("Hello, %s!\n", name)
    }("Go") 

    // 带返回值的匿名函数立即调用（用变量接收结果）
    result := func(a, b int) int {
        return a + b
    }(3, 5)
    fmt.Println(result) 
}
```
> 匿名函数的函数体后紧跟的 () 是函数调用运算符，作用是立即执行该匿名函数。

##### 2.2 赋值给变量（复用匿名函数）
```go
func main() {
    // 定义匿名函数并赋值给变量
    add := func(a, b int) int {
        return a + b
    }
    fmt.Println(add(2, 3))

    // 匿名函数也可作为变量传递
    var calc func(int, int) int = add
    fmt.Println(calc(5, 5)) 
}
```

##### 2.3 作为函数参数（回调函数）
```go
// 高阶函数：接收一个函数作为参数
func process(nums []int, op func(int) int) []int {
    result := make([]int, len(nums))
    for i, n := range nums {
        result[i] = op(n) // 调用传入的匿名函数
    }
    return result
}

func main() {
    nums := []int{1, 2, 3, 4}

    // 传递匿名函数作为参数（实现“乘2”逻辑）
    doubled := process(nums, func(x int) int {
        return x * 2
    })
    fmt.Println(doubled) // [2 4 6 8]

    // 传递另一个匿名函数（实现“平方”逻辑）
    squared := process(nums, func(x int) int {
        return x * x
    })
    fmt.Println(squared) // [1 4 9 16]
}
```

##### 2.4 闭包
闭包特性：
- 捕获外部变量：闭包可以访问定义它时所在作用域的变量（无需通过参数传递）。
- 延长变量生命周期：被捕获的变量不会随外部函数的结束而销毁，而是与闭包绑定，直到闭包本身被销毁。
- 修改外部变量：闭包对捕获的变量是 “**引用访问**”，修改闭包内的变量会直接影响外部变量。

示例：
```go
// 工厂函数：返回一个匿名函数（闭包）
func makeCounter(step int) func() int {
    count := 0 // 被匿名函数捕获的变量
    // 返回匿名函数，每次调用自增count
    return func() int {
        count += step
        return count
    }
}

func main() {
    // 创建步长为1的计数器
    counter1 := makeCounter(1)
    fmt.Println(counter1()) // 1
    fmt.Println(counter1()) // 2

    // 创建步长为3的计数器（独立状态）
    counter2 := makeCounter(3)
    fmt.Println(counter2()) // 3
    fmt.Println(counter2()) // 6
}
```
> count 能实现累加，本质是因为：匿名函数（闭包）通过引用捕获了外部变量 count；被捕获的 count 生命周期被延长，与闭包绑定，不会随外部函数结束而销毁；每次调用闭包时，都是在修改同一个 count 变量，因此会持续累加。

引用访问的坑（错误示例）：
```go
func main() {
	var functions []func()
	for i := 0; i < 3; i++ {
		// 闭包捕获的是变量 i 的引用，不是当前值
		functions = append(functions, func() {
			fmt.Println(i)
		})
	}
	// 执行所有闭包，此时循环已结束，i=3
	for _, f := range functions {
		f() // 输出：3 3 3，而非预期的 0 1 2
	}
}
```
修复方案
```go
// 循环内创建局部变量副本，切断引用绑定
func main() {
	var functions []func()
	for i := 0; i < 3; i++ {
		// 创建局部变量副本，每次循环都是新的内存地址
		v := i
		functions = append(functions, func() {
			fmt.Println(v)
		})
	}
	for _, f := range functions {
		f() // 输出：0 1 2
	}
}
```
### 七、type的用法
#### 1. 定义自定义类型（全新类型）
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


### 八、defer
#### 1. defer的核心特性
defer语句会将其后面跟随的语句进行延迟处理，在defer归属的函数即将返回时，将延迟处理的语句按defer定义的逆序进行执行（defer 的执行顺序遵循后进先出原则，当函数中执行到 defer 语句时，Go 编译器并不会立即执行 defer 后的函数，而是将该 defer 相关的信息（包括函数地址、参数值等）压入一个专门的 "defer 栈" 中。）

#### 2. defer的参数即时求值
对于defer直接作用的函数而言，它的**参数**是会被预计算的
```go
i := 10
defer fmt.Println("defer 执行：", i) // 此时 i=10 已确定
i = 20
fmt.Println("当前 i：", i)//20
// 输出
// 当前 i： 20
// defer 执行： 10
```
```go
func main() {
  defer fmt.Println(Fn1())
  fmt.Println("3")
}

func Fn1() int {
  fmt.Println("2")
  return 1
}
// 输出
// 2
// 3
// 1
```


### 九、异常处理（panic,recover,errors）
（原笔记未提供具体代码示例，预留异常处理扩展空间）


### 十、time包
#### 1. 基本时间获取
```go
now := time.Now() // 获取当前时间
fmt.Println("当前时间：", now)

// 提取时间字段
fmt.Println("年：", now.Year())
fmt.Println("月：", now.Month())     // 返回 Month 类型（如 January）
fmt.Println("月（数字）：", int(now.Month()))
fmt.Println("日：", now.Day())
fmt.Println("时：", now.Hour())
fmt.Println("分：", now.Minute())
fmt.Println("秒：", now.Second())
fmt.Println("纳秒：", now.Nanosecond())
```

#### 2. 时间格式化与解析
> Go 的时间格式化比较特殊，必须使用固定的参考时间 2006-01-02 15:04:05（这是 Go 诞生的时间，便于记忆）作为格式模板

```go
func main() {
    now := time.Now()
    // 常用格式示例
    fmt.Println(now.Format("2006-01-02"))       // 2023-10-05
    fmt.Println(now.Format("15:04:05"))         // 14:30:25
    fmt.Println(now.Format("2006-01-02 15:04:05")) // 2023-10-05 14:30:25
    fmt.Println(now.Format("2006年01月02日 15时04分05秒")) // 2023年10月05日 14时30分25秒
}
```

#### 3. 时间戳
时间戳是自 1970-01-01 00:00:00 UTC 以来的秒数或纳秒
```go
func main() {
    now := time.Now()
    // 时间转时间戳（秒）
    sec := now.Unix()
    fmt.Println("秒级时间戳：", sec)

    // 时间转时间戳（纳秒）
    nsec := now.UnixNano()
    fmt.Println("纳秒级时间戳：", nsec)

    // 时间戳转时间（秒）
    t := time.Unix(sec, 0)
    fmt.Println("从秒级时间戳恢复：", t)
}
```

#### 4. 解析时间字符串
time.Parse(layout, value string) (Time, error)
```go
func main() {
    // 解析 "2023-10-05 14:30:25" 格式的字符串
    str := "2023-10-05 14:30:25"
    t, err := time.Parse("2006-01-02 15:04:05", str)
    if err != nil {
        fmt.Println("解析失败：", err)
        return
    }
    fmt.Println("解析后的时间：", t)
    fmt.Println("小时：", t.Hour()) // 14
}
```

#### 5. 时间间隔
```go
func main() {
    now := time.Now()
    // 1小时后
    later := now.Add(1 * time.Hour)
    fmt.Println("1小时后：", later)

    // 30分钟前
    earlier := now.Add(-30 * time.Minute)
    fmt.Println("30分钟前：", earlier)

    // 计算两个时间的间隔
    diff := later.Sub(earlier)
    fmt.Println("间隔：", diff) // 1h30m0s
    fmt.Println("间隔（分钟）：", diff.Minutes()) // 90

    // 时间比较
    fmt.Println("now 在 later 之前吗？", now.Before(later)) // true
}
```

#### 6. 睡眠与计时：Sleep() 和 Since()
> time.Sleep(d Duration)：让当前 goroutine 暂停指定时间。
> time.Since(t Time)：计算从 t 到现在的间隔（等价于time.Now().Sub(t)），常用于计时。

```go
func main() {
    // 睡眠1秒
    fmt.Println("开始睡眠...")
    time.Sleep(1 * time.Second)
    fmt.Println("睡眠结束")

    // 计时：统计代码执行耗时
    start := time.Now()
    // 模拟耗时操作
    for i := 0; i < 100000000; i++ {}
    elapsed := time.Since(start) // 等价于 time.Now().Sub(start)
    fmt.Printf("操作耗时：%v\n", elapsed) // 如 12ms
}
```

#### 7. 定时器：time.Ticker 和 time.After()
用于周期性执行任务或延迟执行任务
```go
func main() {
    // 创建一个每秒触发一次的定时器
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop() // 程序结束时停止定时器

    // 执行5次后退出
    count := 0
    for t := range ticker.C {
        count++
        fmt.Printf("第%d次触发：%v\n", count, t.Format("15:04:05"))
        if count >= 5 {
            break
        }
    }
}
```


### 十一、指针，make与new
#### 1. Go指针特性
Go中，禁止一切指针运算，自动进行内存管理

#### 2. new与make的核心区别
##### 2.1 返回类型
- new(T)：返回指向类型 T 的指针（*T），即分配的内存地址。
- make(T, args)：返回类型 T 本身（非指针），因为这三种引用类型（slice/map/chan）本身就隐式包含了指针（指向底层数据结构）。

##### 2.2 初始化行为
- new(T)：仅做两件事：
  1、为类型 T 分配一块内存；
  2、将内存初始化为 T 的零值（如 int 零值为 0，string 零值为 ""，结构体零值为所有字段零值）。
  它不会对内存做额外的 “初始化操作”（比如不会初始化切片的底层数组、map 的哈希表等）。

- make(T, args)：不仅分配内存，还会初始化该引用类型的内部数据结构（这是它仅用于 slice/map/chan 的原因）：
  - 对 slice：初始化底层数组，并设置长度（len）和容量（cap）；
  - 对 map：初始化哈希表结构，使其可以直接存储键值对；
  - 对 chan：初始化通道的缓冲区等内部结构，使其可以直接收发数据。


### 十二、结构体
#### 1. 结构体初始化方式
|初始化方式|语法示例|变量类型|适用场景|
|---|---|---|---|
|零值初始化|`var p Person`|`Person`|需默认零值，后续手动赋值|
|键值对初始化<值类型>|`p:=Person{Name: "Alice"}`|`Person`|需指定部分/全部字段，值类型|
|键值对初始化<指针类型>|`p:=&Person{Name: "Bob"}`|`*Person`| 需指针类型，避免值拷贝|
|位置参数初始化|`p:=Person{"Charlie", 18}`|`Person`|字段少且顺序固定的简单结构体|
|`new` 函数初始化|`p:=new(Person)`|`*Person`|需指针类型，先零值后赋值|
|嵌套结构体初始化|`s:=Student{Info: Person{...}}`|外层结构体类型|包含嵌套字段的结构体|

#### 2. 结构体字段访问控制
字段名首字母大写（如 Name）时，该字段是导出字段，可被其他包访问；首字母小写（如 age）时，是未导出字段，仅能在当前包内访问。

#### 3. 为结构体定义方法
```go
func (接收者变量 接收者类型) 方法名(参数列表) (返回值列表) {
    // 方法体（可通过接收者访问结构体字段）
}
```


### 十三、json转换
#### 1. 结构体与JSON的相互转换
```go
package main
import (
	"encoding/json"
	"fmt"
)
type student struct {
	Name string
	Age  int
}
func main() {
	s := []student{
		{"Alice", 20},
		{"Bob", 30},
	}
	fmt.Println(s)//输出：[{Alice 20} {Bob 30}]
	a, _ := json.Marshal(s)//返回[]byte类型和error
	fmt.Println(string(a))//输出：[{"Name":"Alice","Age":20},{"Name":"Bob","Age":30}]

	var b []student
	_ = json.Unmarshal(a, &b)//a为[]byte类型，要把b的地址传入，返回error
	fmt.Println(b)//输出：[{Alice 20} {Bob 30}]
}
```

#### 2. 结构体标签（JSON字段重命名）
```go
type student struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}
func main() {
	s := []student{
		{"Alice", 20},
		{"Bob", 30},
	}
	a, _ := json.Marshal(s) //返回[]byte类型和error
	fmt.Println(string(a))  //输出：[{"name":"Alice","age":20},{"name":"Bob","age":30}]
}
```


### 十四、接口
#### 1. 接口的核心概念
接口是一种抽象数据类型，是一组函数的集合，不能包含任何变量。在Golang中，接口中的所有方法都没有方法体，接口定义了一个对象的行为规范，只定义规范不实现，体现了多态和高内聚低耦合的思想，接口变量存储的是 “类型信息 + 值” 的抽象组合。

#### 2. 接口定义
```go
type 接口名 interface {
    方法名1(参数列表) 返回值列表
    方法名2(参数列表) 返回值列表
    // ... 更多方法
}
```

#### 3. 接口使用示例
```go
package main

import "fmt"

type Usber interface {
	GetName() string
}
type phone struct {
	Name string
}

func (p phone) GetName() string {
	return p.Name
}

type computer struct {
	Name string
}

func (c computer) GetName() string {
	return c.Name
}
func check_usb(usb Usber) {
	fmt.Println(usb.GetName(), "check_usb")
}
func main() {
	p := phone{"华为"}
	c := computer{"拯救者"}
	check_usb(p)
	check_usb(c)
    var usb Usber
    usb = p//p实现接口
    fmt.Println(usb.GetName())
}
```

#### 4. 值接受者和指针接受者的区别
|方法接收者类型|实现接口的类型（可赋值给接口变量）|原理|
|:---:|:---:|:---:|
|值接收者(func(s T) Method())|结构体的值类型(T)和指针类型(*T)都实现接口|指针类型（*T）可以自动解引用为值类型（T），因此能调用值接收者的方法|
|指针接收者(func (s *T) Method())|只有结构体的指针类型（*T）实现接口，值类型（T）不实现|值类型（T）无法自动转为指针类型（*T），因此不能调用指针接收者的方法|

#### 5. 空接口
##### 5.1 空接口定义
```go
// 空接口的定义（没有任何方法）
type EmptyInterface interface{}
// 更常用的简写形式（直接使用 interface{}）
var any interface{}
```

##### 5.2 空接口用法
> 空接口的用法主要围绕 “存储任意类型” 和 “传递任意类型”

1. 作为变量存储任意类型的值
```go
var any interface{} // 声明空接口变量
// 存储基本类型
any = 100         // 存储int
fmt.Printf("类型: %T, 值: %v\n", any, any) // 输出：类型: int, 值: 100
any = "hello"     // 存储string
fmt.Printf("类型: %T, 值: %v\n", any, any) // 输出：类型: string, 值: hello
// 存储复合类型
any = []int{1, 2, 3} // 存储切片
fmt.Printf("类型: %T, 值: %v\n", any, any) // 输出：类型: []int, 值: [1 2 3]
// 存储结构体
type Person struct{ Name string }
any = Person{Name: "张三"}
fmt.Printf("类型: %T, 值: %v\n", any, any) // 输出：类型: main.Person, 值: {张三}
```

2. 作为函数参数接收任意类型
（预留函数参数示例扩展空间）

3. 作为返回值返回任意类型
（预留返回值示例扩展空间）

4. 作为容器存储多种类型的元素
```go
// 空接口切片：可存储任意类型的元素
data := []interface{}{
    "苹果",    // string
    3.14,     // float64
    true,     // bool
    []int{1, 2}, // 切片
    map[string]int{"a": 1}, // 映射
}
// 遍历并打印元素类型和值
for i, v := range data {
    fmt.Printf("索引%d: 类型=%T, 值=%v\n", i, v, v)
}
```

5. 类型断言

a. value, ok := 空接口变量.(目标类型)
> 若转换成功，value 是具体类型的值，ok 为 true；若转换失败，value 是目标类型的零值，ok 为 false（避免直接转换导致 panic）。

```go
var any interface{} = "hello"
// 安全的类型断言（判断是否为string）
if s, ok := any.(string); ok {
    fmt.Println("是字符串:", s) // 输出：是字符串: hello
} else {
    fmt.Println("不是字符串")
}
// 若尝试转换为错误类型（如int）
if i, ok := any.(int); ok {
    fmt.Println("是整数:", i)
} else {
    fmt.Println("不是整数") // 输出：不是整数
}
```

b. x.(type)，只能结合switch语句使用
```go
func checkType(v interface{}) {
    switch v.(type) { // 类型分支语法：v.(type)
    case int:
        fmt.Println("这是int类型")
    case string:
        fmt.Println("这是string类型")
    case []int:
        fmt.Println("这是[]int类型")
    default:
        fmt.Println("未知类型")
    }
}
func main() {
    checkType(100)        // 输出：这是int类型
    checkType("hello")    // 输出：这是string类型
    checkType([]int{1,2}) // 输出：这是[]int类型
}
```


### 十五、goroutine
#### 1. goroutine启动语法
用go关键字启动 goroutine
```go
// 定义一个要在goroutine中执行的函数
func sayHello(name string) {
    for i := 0; i < 3; i++ {
        fmt.Printf("Hello, %s! 第%d次\n", name, i+1)
        time.Sleep(100 * time.Millisecond) // 模拟耗时操作
    }
}
func main() {
    // 启动一个goroutine执行sayHello("goroutine")
    go sayHello("goroutine")
    // 主goroutine执行sayHello("main")
    sayHello("main")
}
```

#### 2. 等待goroutine完成：使用sync.WaitGroup
```go
// 接收WaitGroup指针，避免值拷贝
func task(id int, wg *sync.WaitGroup) {
    defer wg.Done() // 任务完成后，通知WaitGroup计数器减1
    fmt.Printf("任务%d开始\n", id)
    time.Sleep(500 * time.Millisecond) // 模拟任务耗时
    fmt.Printf("任务%d完成\n", id)
}
func main() {
    var wg sync.WaitGroup
    // 启动5个goroutine
    for i := 1; i <= 5; i++ {
        wg.Add(1) // 每启动一个goroutine，计数器加1
        go task(i, &wg)
    }
    wg.Wait() // 阻塞主goroutine，直到计数器减为0（所有任务完成）
    fmt.Println("所有任务执行完毕，程序退出")
}
```


### 十六、channel(引用类型)
#### 1. channel定义
```go
ch := make(chan 数据类型) //无缓冲channel（同步channel）
ch := make(chan 数据类型, 缓冲区大小) //有缓冲channel（异步channel）
```

#### 2. channel使用
##### 2.1 发送数据（ch<-数据）
```go
ch := make(chan int)
go func() {
    ch <- 100 // 向channel发送100
}()
```

##### 2.2 接收数据（<-ch 或 value, ok <- ch）
```go
ch := make(chan int, 1)
ch <- 100

// a.基本接收
v1 := <-ch
fmt.Println(v1) // 输出：100

// b.带状态接收（channel已空，此时关闭）
close(ch)
v2, ok := <-ch
fmt.Println(v2, ok) // 输出：0 false（0是int的零值，ok为false表示channel已关闭）

// for range 接收 channel
ch := make(chan int, 3)
ch <- 1
ch <- 2
ch <- 3
close(ch) 

// 循环接收所有数据
for v := range ch {
    fmt.Println(v) // 依次输出1、2、3
}
```

##### 2.3 单向channel（限制操作方向）
```go
// 只发送channel作为参数（函数内只能向ch发送数据）
func sender(ch chan<- int) {
    ch <- 100
    // <-ch // 编译错误：不能从只发送channel接收
}

// 只接收channel作为参数（函数内只能从ch接收数据）
func receiver(ch <-chan int) {
    fmt.Println(<-ch)
    // ch <- 200 // 编译错误：不能向只接收channel发送
}

func main() {
    ch := make(chan int)
    go sender(ch) // 普通channel可隐式转换为单向channel
    receiver(ch)
    close(ch)
}
```


### 十七、select
#### 1. select基本用法
```go
select {
case <-ch1:  // 取出通道ch1的数据
    // 处理逻辑
case ch2 <- data:  // 向通道ch2发送数据
    // 处理逻辑
case <-ch3:  // 其他通道操作
    // 处理逻辑
default:  // 可选，所有case都无法执行时执行
    // 避免阻塞的逻辑
}
```

#### 2. select适用场景
##### 2.1 同时处理多个通道的并发事件
```go
func handleEvents(reqChan chan Request, notifyChan chan Notify) {
    for {
        select {
        case req := <-reqChan:  // 处理用户请求
            processRequest(req)
        case notify := <-notifyChan:  // 处理系统通知
            processNotify(notify)
        }
    }
}
```

##### 2.2 协调多个通道的同步
```go
func main() {
	c1 := make(chan int, 10)
	c2 := make(chan int, 10)
	for i := 1; i < 10; i++ {
		c1 <- i
		c2 <- i
	}
	for {
		select {
		case v := <-c1: // 接收一次，保存到变量v
			fmt.Println("从c1传出", v)
		case v := <-c2: // 接收一次，保存到变量v
			fmt.Println("从c2传出", v)
		default:
			fmt.Println("执行结束")
			return
		}
	}
}
```


### 十八、互斥锁（Mutex）
#### 1. 互斥锁使用案例
```go
package main
import (
	"fmt"
	"sync"
)
var (
	count int           // 共享资源：计数器
	mu    sync.Mutex    // 互斥锁，保护count
	wg    sync.WaitGroup // 用于等待所有协程完成
)
// 对计数器执行累加操作
func increment() {
	defer wg.Done() // 协程完成后通知WaitGroup
	mu.Lock()       // 加锁：独占访问count
	count++         // 操作共享资源
	mu.Unlock()     // 解锁：允许其他协程访问
}
func main() {
	wg.Add(1000) // 注册1000个协程
	// 启动1000个协程同时累加
	for i := 0; i < 1000; i++ {
		go increment()
	}
	wg.Wait() // 等待所有协程完成
	fmt.Println("最终计数：", count) // 输出：1000（正确）
}
```

#### 2. 读写锁：sync.RWMutex
Go 语言通过 sync.RWMutex 实现读写锁，核心方法如下:

|方法|作用|适用场景|
|---|---|---|
|RLock()|获取读锁(多个协程可同时获取)|读取共享资源时|
|RUnlock()|释放读锁（与 RLock() 配对使用）|读操作完成后|
|Lock()|获取写锁（仅一个协程可获取）|修改共享资源时|
|Unlock()|释放写锁(与 Lock() 配对使用)|写操作完成后|

##### 2.1 未使用读锁的问题（脏读示例）
```go
// 共享资源：订单信息（金额和状态）
type Order struct {
	Amount int    // 金额
	Status string // 状态："未支付"/"已支付"
}
var (
	order = Order{Amount: 100, Status: "未支付"}
	rwMu  sync.RWMutex // 读写锁
	wg    sync.WaitGroup
)
// 读操作：不使用读锁（直接读取）
func readOrder(id int) {
	defer wg.Done()
	// 不获取读锁，直接访问共享资源
	time.Sleep(10 * time.Millisecond) // 模拟读耗时
	fmt.Printf("读协程%d: 金额=%d, 状态=%s\n", id, order.Amount, order.Status)
}
// 写操作：使用写锁保护（正确加锁）
func payOrder() {
	defer wg.Done()
	rwMu.Lock()         // 获取写锁（阻止其他写操作）
	defer rwMu.Unlock() // 释放写锁
	// 分步更新订单（先改金额，再改状态，模拟实际业务的多步操作）
	order.Amount = 0          // 金额清零（支付完成）
	time.Sleep(50 * time.Millisecond) // 模拟中间处理耗时
	order.Status = "已支付"     // 更新状态
	fmt.Println("写协程：支付完成，金额=0，状态=已支付")
}
func main() {
	// 启动5个读协程（无读锁）
	wg.Add(5)
	for i := 1; i <= 5; i++ {
		go readOrder(i)
	}
	// 启动1个写协程（用写锁）
	wg.Add(1)
	go payOrder()
	wg.Wait()
}
```
> 可能的输出（存在脏读）：
> 读协程1: 金额=100, 状态=未支付  // 写操作前正常读取
> 读协程2: 金额=0, 状态=未支付    // 脏读（金额已改，状态未改）
> 读协程3: 金额=0, 状态=未支付    // 脏读
> 写协程：支付完成，金额=0，状态=已支付
> 读协程4: 金额=0, 状态=已支付    // 写操作后正常读取
> 读协程5: 金额=0, 状态=已支付


### 十九、反射
#### 1. 获取类型信息（reflect.Type）
```go
type User struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}
func (u User) Hello() string {
	return "hello, " + u.Name
}
func main() {
	u := User{Name: "张三", Age: 20}
	t := reflect.TypeOf(u) // 获取u的类型信息
	// 1. 基本类型信息
	fmt.Println("类型名称:", t.Name())      // 输出：User（结构体名称）
	fmt.Println("类型种类:", t.Kind())      // 输出：struct（类型的种类，如struct、int、slice等）
	// 2. 结构体字段信息（需先判断Kind为struct）
	if t.Kind() == reflect.Struct {
		for i := 0; i < t.NumField(); i++ {
			field := t.Field(i)
			fmt.Printf("字段名: %s, 类型: %s, 标签: %s\n", 
				field.Name,    // 字段名称
				field.Type,    // 字段类型
				field.Tag)     // 字段标签（如json标签）
		}
	}
	// 3. 方法信息
	fmt.Println("方法数量:", t.NumMethod()) // 输出：1（User有一个Hello方法）
	method := t.Method(0)
	fmt.Println("方法名:", method.Name)    // 输出：Hello
}
```

#### 2. 获取值信息（reflect.Value）
```go
func main() {
	num := 100
	v := reflect.ValueOf(num) // 获取num的值信息
	// 1. 基本值访问
	fmt.Println("值:", v.Int()) // 输出：100（Int()适用于int类型，类似有Float()、String()等）
	fmt.Println("是否可设置:", v.CanSet()) // 输出：false（因为v是num的副本，不是指针）
	// 2. 修改值（需通过指针获取可设置的Value）
	numPtr := &num
	vPtr := reflect.ValueOf(numPtr).Elem() // Elem()获取指针指向的元素
	fmt.Println("指针元素是否可设置:", vPtr.CanSet()) // 输出：true
	vPtr.SetInt(200) // 修改值
	fmt.Println("修改后num:", num) // 输出：200
	// 3. 调用方法（以User为例）
	u := User{Name: "张三", Age: 20}
	vUser := reflect.ValueOf(u)
	method := vUser.MethodByName("Hello") // 通过名称获取方法
	if method.IsValid() {
		// 调用无参方法（参数用空切片）
		result := method.Call([]reflect.Value{})
		fmt.Println("方法返回值:", result[0].String()) // 输出：hello, 张三
	}
}
```

#### 3. 类型断言与反射结合
```go
type User struct {
	Name string
	Age  int
}
// 处理任意类型的变量（结合反射和类型断言）
func processData(data interface{}) {
	// 第一步：用反射获取类型和值的基本信息
	t := reflect.TypeOf(data)
	v := reflect.ValueOf(data)
	fmt.Printf("反射分析：类型=%s，种类=%s\n", t, t.Kind())
	// 第二步：根据反射的Kind，用类型断言处理具体类型
	switch t.Kind() {
	case reflect.Int:
		// 类型断言：转换为int
		if num, ok := data.(int); ok {
			fmt.Printf("处理int：%d + 10 = %d\n", num, num+10)
		}
	case reflect.String:
		// 类型断言：转换为string
		if str, ok := data.(string); ok {
			fmt.Printf("处理string：长度=%d，内容=%s\n", len(str), str)
		}
	case reflect.Struct:
		// 反射：获取结构体字段信息
		fmt.Println("结构体字段：")
		for i := 0; i < t.NumField(); i++ {
			fmt.Printf("  字段名：%s，类型：%s\n", t.Field(i).Name, t.Field(i).Type)
		}
		// 类型断言：转换为具体结构体（如User）
		if user, ok := data.(User); ok {
			fmt.Printf("处理User：%s今年%d岁\n", user.Name, user.Age)
		}
	case reflect.Slice:
		// 反射：获取切片元素类型
		elemType := t.Elem()
		fmt.Printf("切片元素类型：%s\n", elemType)
		// 类型断言：转换为[]int（假设切片可能是[]int）
		if nums, ok := data.([]int); ok {
			sum := 0
			for _, n := range nums {
				sum += n
			}
			fmt.Printf("处理[]int：总和=%d\n", sum)
		}
	default:
		fmt.Println("不支持的类型")
	}
}
func main() {
	processData(100)                     // 处理int
	processData("hello")                 // 处理string
	processData(User{Name: "张三", Age: 20}) // 处理结构体
	processData([]int{1, 2, 3})          // 处理切片
}
```
### 二十、slices包的使用
`slices` 是 Go **1.21+** 引入的标准库，基于泛型实现，提供了一套类型安全、开箱即用的切片操作函数，替代了传统手写循环、零散的工具逻辑，也是现代 Go 开发处理切片的首选方案。

#### 基础前提
1. 导入路径：`import "slices"`
2. 所有函数支持**任意元素类型**的切片，编译期类型安全，无运行时断言风险；
3. 多数修改类函数为**原地操作底层数组**，并返回更新后的切片头（包含新的 `len/cap`），**建议接收返回值**。
#### 1、切片拷贝（高频）
##### `slices.Clone`
功能：深度克隆一个切片，返回独立的新切片（修改新切片不会影响原切片），常用于保留原数据、避免原地修改副作用。
函数签名：
```go
func Clone[S ~[]E, E any](s S) S
```
示例：
```go
package main

import (
	"fmt"
	"slices"
)

func main() {
	original := []int{1, 2, 3}
	clone := slices.Clone(original)

	clone[0] = 100
	fmt.Println(original) // [1 2 3] 原切片不受影响
	fmt.Println(clone)    // [100 2 3]
}
```

---

#### 2、元素查找与包含判断（高频）
这类函数用于检索元素位置、判断元素是否存在，替代手写 `for` 循环遍历。

| 函数 | 功能 |
|------|------|
| `Contains(s S, v E) bool` | 判断切片是否包含指定元素 |
| `ContainsFunc(s S, f func(E) bool) bool` | 自定义匹配条件，判断是否存在符合条件的元素 |
| `Index(s S, v E) int` | 返回元素第一次出现的索引，不存在返回 `-1` |
| `IndexFunc(s S, f func(E) bool) int` | 自定义匹配条件，返回第一个符合条件元素的索引 |
| `BinarySearch(s S, v E) (int, bool)` | 对**有序切片**二分查找，返回索引和是否找到 |

##### 基础示例
```go
package main

import (
	"fmt"
	"slices"
)

func main() {
	nums := []int{10, 20, 30, 20}

	// 1. 判断是否包含元素
	fmt.Println(slices.Contains(nums, 20)) // true

	// 2. 查找元素索引
	fmt.Println(slices.Index(nums, 20)) // 1

	// 3. 自定义条件查找：查找大于25的元素
	idx := slices.IndexFunc(nums, func(v int) bool { return v > 25 })
	fmt.Println(idx) // 2

	// 4. 二分查找（切片必须有序）
	sorted := []int{1, 3, 5, 7, 9}
	pos, found := slices.BinarySearch(sorted, 5)
	fmt.Println(pos, found) // 2 true
}
```

---

#### 3、切片增删改（高频）
用于动态修改切片内容（插入、删除、替换区间），**函数会返回新的切片头，必须用变量接收**。

| 函数 | 功能 |
|------|------|
| `Insert(s S, i int, v ...E) S` | 在索引 `i` 处插入若干元素 |
| `Delete(s S, i, j int) S` | 删除切片区间 `[i, j)` 的元素，左闭右开 |
| `Replace(s S, i, j int, src S) S` | 用 `src` 切片替换原切片 `[i, j)` 区间 |

##### 示例
```go
func main() {
	s := []int{1, 2, 5}

	// 1. 插入元素：索引2处插入3,4
	s = slices.Insert(s, 2, 3, 4)
	fmt.Println(s) // [1 2 3 4 5]

	// 2. 删除元素：删除索引[3,5)，即4、5
	s = slices.Delete(s, 3, 5)
	fmt.Println(s) // [1 2 3]

	// 3. 替换元素：用[9,8]替换索引[1,2)的元素
	s = slices.Replace(s, 1, 2, []int{9, 8}...)
	fmt.Println(s) // [1 9 8 3]
}
```

---

#### 4、排序与有序校验（结合你之前的学习重点）
支持默认排序和自定义排序，替代传统 `sort` 包的复杂接口实现，是结构体切片排序的首选。

| 函数 | 功能 |
|------|------|
| `Sort(S)` | 对基础类型（`int/string/float`）切片**升序排序** |
| `SortFunc(S, cmp func(a,b E)int)` | 自定义规则排序（最常用） |
| `SortStable(S)` | 稳定排序（相等元素保留原始顺序） |
| `SortStableFunc(...)` | 自定义规则稳定排序 |
| `IsSorted(S)` | 判断切片是否有序 |

##### 示例
```go
type User struct {
	Name string
	Age  int
}

func main() {
	// 基础类型排序
	strs := []string{"banana", "apple"}
	slices.Sort(strs)
	fmt.Println(strs) // [apple banana]

	// 自定义排序：按年龄降序
	users := []User{{"Tom", 25}, {"Jerry", 20}}
	slices.SortFunc(users, func(a, b User) int {
		return b.Age - a.Age
	})
	fmt.Println(users) // [{Tom 25} {Jerry 20}]

	// 判断是否有序
	fmt.Println(slices.IsSorted(strs)) // true
}
```

---

#### 5、切片比较
用于判断两个切片是否完全相等（长度+所有元素一致），支持自定义比较规则。
- `Equal(s1, s2 S) bool`：基础类型直接比较
- `EqualFunc(s1, s2 S, eq func(a,b E) bool) bool`：自定义比较逻辑

```go
func main() {
	a := []int{1, 2, 3}
	b := []int{1, 2, 3}
	c := []int{1, 3, 2}

	fmt.Println(slices.Equal(a, b)) // true
	fmt.Println(slices.Equal(a, c)) // false
}
```

---

#### 6、实用工具函数
##### 6.1  `Reverse`
反转切片元素顺序，原地修改：
```go
s := []int{1,2,3}
slices.Reverse(s)
fmt.Println(s) // [3 2 1]
```

##### 6.2. `Fill`
用指定值填充整个切片，常用于初始化：
```go
s := make([]int, 3)
slices.Fill(s, 10)
fmt.Println(s) // [10 10 10]
```

##### 6.3. 容量优化
- `Clip(s S) S`：裁剪容量，使 `cap = len`，释放多余内存
- `Grow(s S, n int) S`：预分配容量，避免频繁扩容提升性能

##### 6.4. 去重
- `Compact(s S) S`：去除**相邻重复**元素（排序后可实现全切片去重）
- `CompactFunc(s S, eq func(a,b E)bool) S`：自定义去重规则
```go
s := []int{1,1,2,2,3}
s = slices.Compact(s)
fmt.Println(s) // [1 2 3]
```
#### 总结
按工程使用优先级划分核心函数：
1. **必掌握**：`Clone`、`Contains/Index`、`Insert/Delete`、`SortFunc`、`Reverse`；
2. **场景化使用**：`BinarySearch`（有序查找）、`Compact`（去重）、`Equal`（切片对比）；
3. **性能优化**：`Grow/Clip`（容量管理）。

---
参考资料
- [Golong中文学习文档](https://golang.halfiisland.com/)
- [Go语言设计与实现](https://draven.co/golang/)
- [Go语言菜鸟教程](https://www.runoob.com/go/go-tutorial.html)