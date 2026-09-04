---
title: "go-playground/validator 常用验证标签中文速查"
description: "按官方分类整理 go-playground/validator 常用标签，面向 Go Web 里的结构体字段校验。"
publishedAt: "2026-09-03T02:34:00+08:00"
tags:
  - Go
  - 校验
draft: false
# 禁止修改
id: 28
---

# go-playground/validator 常用验证标签中文速查

> 基于 `github.com/go-playground/validator/v10` 官方文档整理。  
> 本文只选取 Go Web 开发中较常用的标签，并按照官方文档中 **Baked-in Validations** 的分类顺序排列。  

## Special Notes

如果刚开始使用 `validator`，官方建议初始化时启用 `WithRequiredStructEnabled`：

```go
validate := validator.New(validator.WithRequiredStructEnabled())
```

这是 v11 之后计划成为默认行为的新语义。开启后，`required` 等验证对于结构体零值的判断会更加一致。

通常在结构体字段上使用 `validate` 标签：

```go
type RegisterRequest struct {
    Username string `json:"username" validate:"required,min=3,max=20"`
    Password string `json:"password" validate:"required,min=8,max=64"`
    Email    string `json:"email" validate:"omitempty,email"`
}
```

多个验证规则使用英文逗号连接：

```go
validate:"required,min=3,max=20"
```

---

## Fields

这一组标签用于比较**当前字段与另一个字段**。

### `eqfield`

当前字段必须等于指定字段。

```go
type Request struct {
    Password        string `validate:"required"`
    ConfirmPassword string `validate:"required,eqfield=Password"`
}
```

`ConfirmPassword` 必须与 `Password` 相同。

### `nefield`

当前字段不能等于指定字段。

```go
type Request struct {
    OldPassword string `validate:"required"`
    NewPassword string `validate:"required,nefield=OldPassword"`
}
```

`NewPassword` 不能与 `OldPassword` 相同。

### `gtfield`

当前字段必须大于指定字段。

```go
type Range struct {
    Min int `validate:"required"`
    Max int `validate:"gtfield=Min"`
}
```

### `gtefield`

当前字段必须大于或等于指定字段。

```go
type Range struct {
    Min int `validate:"required"`
    Max int `validate:"gtefield=Min"`
}
```

### `ltfield`

当前字段必须小于指定字段。

```go
type Range struct {
    Max int `validate:"required"`
    Min int `validate:"ltfield=Max"`
}
```

### `ltefield`

当前字段必须小于或等于指定字段。

```go
type Range struct {
    Max int `validate:"required"`
    Min int `validate:"ltefield=Max"`
}
```

---

## Network

这一组标签用于验证网络地址、URL 等内容。

### `port`

验证字符串是否为合法端口号。

```go
Port string `validate:"port"`
```

例如：

```text
8080
443
```

### `ip`

验证字符串是否为合法 IP 地址，可以是 IPv4 或 IPv6。

```go
IP string `validate:"ip"`
```

### `ipv4`

验证字符串是否为合法 IPv4 地址。

```go
IP string `validate:"ipv4"`
```

例如：

```text
192.168.1.1
```

### `ipv6`

验证字符串是否为合法 IPv6 地址。

```go
IP string `validate:"ipv6"`
```

### `uri`

验证字符串是否为合法 URI。

```go
URI string `validate:"uri"`
```

URI 的范围比 URL 更广。

### `url`

验证字符串是否为合法 URL。

```go
Website string `validate:"url"`
```

例如：

```text
https://example.com
```

### `http_url`

验证字符串是否为 HTTP 或 HTTPS URL。

```go
Website string `validate:"http_url"`
```

适合普通 Web 接口中接收网站地址的场景。

### `https_url`

验证字符串是否为仅使用 HTTPS 的 URL。

```go
Website string `validate:"https_url"`
```

---

## Strings

这一组标签主要用于验证字符串内容。

### `alpha`

字符串只能包含英文字母。

```go
Code string `validate:"alpha"`
```

例如 `abcXYZ` 可以通过。

### `alphanum`

字符串只能包含英文字母和数字。

```go
Username string `validate:"alphanum"`
```

例如：

```text
jasper0507
```

### `ascii`

字符串只能包含 ASCII 字符。

```go
Value string `validate:"ascii"`
```

### `contains`

字符串必须包含指定内容。

```go
Value string `validate:"contains=go"`
```

例如 `golang` 可以通过。

### `containsany`

字符串至少包含参数中的任意一个字符。

```go
Password string `validate:"containsany=!@#$%"`
```

### `endswith`

字符串必须以指定内容结尾。

```go
Filename string `validate:"endswith=.json"`
```

### `excludes`

字符串不能包含指定内容。

```go
Username string `validate:"excludes= "`
```

这里表示用户名中不能包含空格。

### `lowercase`

字符串必须全部为小写。

```go
Slug string `validate:"lowercase"`
```

### `number`

验证字符串是否表示数字。

```go
Code string `validate:"number"`
```

### `numeric`

验证值是否为数值类型，或者字符串是否可以表示数值。

```go
Value string `validate:"numeric"`
```

### `startswith`

字符串必须以指定内容开头。

```go
URL string `validate:"startswith=https://"`
```

### `uppercase`

字符串必须全部为大写。

```go
Code string `validate:"uppercase"`
```

---

## Format

这一组标签用于检查常见标准格式。

### `datetime`

根据指定的 Go 时间布局验证日期时间字符串。

```go
Birthday string `validate:"datetime=2006-01-02"`
```

例如：

```text
2026-09-03
```

这里使用的是 Go 的时间布局规则，而不是 `YYYY-MM-DD`。

### `e164`

验证字符串是否符合 E.164 国际电话号码格式。

```go
Phone string `validate:"e164"`
```

例如：

```text
+8613812345678
```

### `email`

验证字符串是否为合法电子邮箱格式。

```go
Email string `validate:"email"`
```

例如：

```text
user@example.com
```

官方同时说明，这项验证不会覆盖所有 RFC 理论上允许的邮件地址形式。

### `hexadecimal`

验证字符串是否仅包含十六进制字符。

```go
Value string `validate:"hexadecimal"`
```

例如：

```text
deadBEEF
```

### `json`

验证字符串是否为合法 JSON。

```go
Payload string `validate:"json"`
```

### `jwt`

验证字符串是否具有合法 JWT 格式。

```go
Token string `validate:"jwt"`
```

这里主要检查 JWT 的格式，不等同于验证签名是否合法。

### `timezone`

验证字符串是否为有效时区名称。

```go
Timezone string `validate:"timezone"`
```

例如：

```text
Asia/Shanghai
```

### `uuid`

验证字符串是否为合法 UUID。

```go
ID string `validate:"uuid"`
```

需要注意，官方文档说明普通 `uuid` 标签不接受大写形式的 UUID；如果需要兼容 RFC 4122 形式，可以查看相应的 `uuid_rfc4122` 标签。

### `semver`

验证字符串是否符合 Semantic Versioning 2.0.0。

```go
Version string `validate:"semver"`
```

例如：

```text
1.2.3
```

---

## Comparisons

这一组标签用于把字段值与**固定参数**比较。

### `eq`

值必须等于指定参数。

```go
Status string `validate:"eq=active"`
```

### `eq_ignore_case`

字符串必须与指定参数相等，但忽略大小写。

```go
Answer string `validate:"eq_ignore_case=yes"`
```

### `gt`

值必须大于指定参数。

对不同类型有不同含义：

- 数字：数值必须大于参数。
- 字符串：字符数量必须大于参数。
- Slice、Array、Map：元素数量必须大于参数。
- `time.Duration`：持续时间必须大于参数。

```go
Age int `validate:"gt=0"`
```

```go
Name string `validate:"gt=2"`
```

### `gte`

值必须大于或等于指定参数。

```go
Age int `validate:"gte=18"`
```

### `lt`

值必须小于指定参数。

```go
Age int `validate:"lt=150"`
```

### `lte`

值必须小于或等于指定参数。

```go
Score int `validate:"lte=100"`
```

### `ne`

值不能等于指定参数。

```go
Role string `validate:"ne=root"`
```

---

## Other

这一组包含日常业务开发中使用频率最高的一批标签。

### `len`

值的长度必须等于指定参数。

对于不同类型：

- 字符串：字符数量必须等于参数。
- Slice、Array、Map：元素数量必须等于参数。
- 数字：数值必须等于参数。

```go
Code string `validate:"len=6"`
```

### `max`

限制最大值或最大长度。

- 数字：值必须小于或等于参数。
- 字符串：字符数量不能超过参数。
- Slice、Array、Map：元素数量不能超过参数。
- `time.Duration`：持续时间不能超过参数。

```go
Username string `validate:"max=20"`
```

### `min`

限制最小值或最小长度。

- 数字：值必须大于或等于参数。
- 字符串：字符数量不能少于参数。
- Slice、Array、Map：元素数量不能少于参数。
- `time.Duration`：持续时间不能小于参数。

```go
Password string `validate:"min=8"`
```

### `oneof`

值必须属于给定值列表之一，可以把它理解为简单的枚举验证。

参数之间使用空格分隔。

```go
Role string `validate:"oneof=user admin guest"`
```

数字同样可以使用：

```go
Level int `validate:"oneof=1 2 3"`
```

如果某个字符串本身包含空格，可以使用单引号包裹：

```go
Color string `validate:"oneof='red green' 'blue yellow'"`
```

### `noneof`

值不能属于给定值列表中的任何一个。

```go
Username string `validate:"noneof=root admin system"`
```

### `required`

字段必须存在，并且不能是该类型的零值。

常见判断规则：

- 数字不能为 `0`
- 字符串不能为 `""`
- `bool` 不能为 `false`
- Slice、Map、Pointer、Interface、Channel、Function 不能为 `nil`
- 开启 `WithRequiredStructEnabled` 后，结构体不能为其零值

```go
Username string `validate:"required"`
```

这是实际 Web 参数校验中最常用的标签之一。

### `required_if`

当指定字段满足给定条件时，当前字段必须存在且非空。

```go
type Request struct {
    LoginType string `validate:"required,oneof=password code"`
    Password  string `validate:"required_if=LoginType password"`
}
```

当 `LoginType == "password"` 时，`Password` 必填。

多个条件可以连续书写：

```go
validate:"required_if=Field1 foo Field2 bar"
```

表示所有指定条件都满足时，当前字段才是必填项。

### `required_unless`

除非指定字段满足某个条件，否则当前字段必须存在且非空。

```go
Value string `validate:"required_unless=Mode auto"`
```

当 `Mode != "auto"` 时，`Value` 必填。

### `required_with`

只要指定字段中的任意一个存在，当前字段就必须存在且非空。

```go
PhoneCode string `validate:"required_with=Phone"`
```

### `required_with_all`

只有指定字段全部存在时，当前字段才必须存在且非空。

```go
Value string `validate:"required_with_all=Field1 Field2"`
```

### `required_without`

当指定字段中的任意一个不存在时，当前字段必须存在且非空。

```go
Email string `validate:"required_without=Phone"`
```

常见场景：邮箱和手机号至少填写一个。

### `required_without_all`

当指定字段全部不存在时，当前字段必须存在且非空。

```go
Contact string `validate:"required_without_all=Email Phone"`
```

### `unique`

验证集合中的元素不能重复。

```go
Tags []string `validate:"unique"`
```

对于结构体 Slice，还可以指定用于判重的字段：

```go
Users []User `validate:"unique=ID"`
```

---

## Aliases

Alias 是由多个验证规则组合出的别名。

### `iscolor`

`iscolor` 是以下颜色格式验证规则的组合：

```text
hexcolor | rgb | rgba | hsl | hsla | cmyk
```

```go
Color string `validate:"iscolor"`
```

### `country_code`

`country_code` 用于验证 ISO 3166 国家代码，内部组合了多种国家代码格式验证。

```go
Country string `validate:"country_code"`
```

---

## 常用组合示例

### 用户注册

```go
type RegisterRequest struct {
    Username        string `json:"username" validate:"required,min=3,max=20,alphanum"`
    Password        string `json:"password" validate:"required,min=8,max=64"`
    ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=Password"`
    Email           string `json:"email" validate:"omitempty,email"`
}
```

### 分页参数

```go
type ListRequest struct {
    Page     int `form:"page" validate:"gte=1"`
    PageSize int `form:"page_size" validate:"gte=1,lte=100"`
}
```

### 枚举参数

```go
type UpdateUserRequest struct {
    Status string `json:"status" validate:"required,oneof=active disabled"`
}
```

## 参考

- `go-playground/validator/v10` 官方文档
- Go Packages：`https://pkg.go.dev/github.com/go-playground/validator/v10#hdr-Baked_In_Validators_and_Tags`
