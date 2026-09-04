---
title: "Go 中使用 UUIDv7 生成分布式 ID"
description: "说明为何用 UUIDv7 做分布式 ID，以及用 Go 1.27 标准库生成并在 MySQL 中存放。"
publishedAt: "2026-09-05T01:51:00+08:00"
tags:
  - Go
  - 分布式
draft: false
# 禁止修改
id: 29
---

# Go 中使用 UUIDv7 生成分布式 ID

在单体应用里，数据库自增主键通常够用。订单、用户、消息开始分散到多个服务或多个数据库以后，ID 最好在写入数据库之前就确定。各个节点可以自行生成，写数据时也不用先去同一个数据库领取编号。

这类 ID 一般称为分布式 ID。在过去的分布式系统中，Snowflake 一类的 64 位 ID 方案非常常见。Go 社区也有不少成熟实现，例如 `bwmarrin/snowflake` 和 Sony 的 `sonyflake`。

RFC 9562 正式定义 UUIDv7 后，多数不要求 64 位整数主键的业务有了一个更省事的选择。UUIDv7 把时间放在高位，保留 UUID 无中心生成的特点，也让数据库索引获得更好的写入局部性。

> 本文示例以 Go 1.27 为准。Go 1.27 已在标准库中加入 `uuid` 包。

## 分布式 ID 生成器

分布式系统里会同时运行多个业务节点。只要两个节点可能在没有协调的情况下创建同一种数据，它们就需要一套不会互相撞车的 ID 生成方式。

### 分布式 ID 的特点

一套实用的分布式 ID 方案通常要顾及下面几件事。

- **足够强的唯一性**。不同节点并行生成 ID 时，发生碰撞的概率应当低到工程上可以忽略。
- **按时间大体有序**。较晚生成的 ID 通常排在较后的位置，数据库主键索引也更容易维持局部写入。
- **生成过程可用**。某个数据库或发号服务暂时不可访问时，业务节点仍能继续创建 ID。
- **生成开销足够低**。ID 生成处在写请求的必经路径上，不能成为明显的性能瓶颈。

订单记录、支付流水记录、消息、文件元数据和审计事件都可能使用分布式 ID。它们未必需要同一种展示格式，但都希望在数据落库以前拿到一个可靠的标识。

### 可能会问的问题

#### 为什么不直接使用数据库自增主键

自增主键并没有过时。单库单表的写入压力不高时，`AUTO_INCREMENT` 短、快，也方便排查数据，继续使用完全合理。

当同一张逻辑表被拆到多个数据库以后，每个数据库都从自己的序列取值，很容易生成重复 ID。可以给各个库分配不同的起始值和步长，也可以再建一个统一的序列服务，这些做法都会重新引入节点分配、扩容和可用性问题。

自增 ID 还要等插入完成后才能返回。业务若想先创建 ID，再写数据库、缓存和消息队列，自增主键就不太顺手。UUIDv7 可以直接在应用进程内生成，后面的写入都能使用同一个 ID。

#### UUID 不是无序的吗

很多人对 UUID 的印象来自 UUIDv4。UUIDv4 的主体由随机数构成，新值会分散到索引的不同位置。把它直接作为聚簇主键时，页分裂、缓存命中和写放大都可能受到影响。

UUIDv7 调整了字段布局。它把 Unix 时间戳放在最高的 48 位，后面再放版本、变体和随机数据。按照 RFC 规定的字节序比较时，较早生成的 UUIDv7 通常排在前面。固定格式的标准字符串也能按字典序得到相同的时间顺序。

代价仍然存在。UUIDv7 占 128 位，标准字符串有 36 个字符，索引会比 `BIGINT` 更大。数据库内部适合保存 16 字节二进制值，对外展示时再转成标准字符串。

## UUIDv7 介绍

UUIDv7 由 RFC 9562 定义。它使用 Unix Epoch 毫秒时间戳，不包含网卡地址，也不用提前给每台机器分配节点编号。不同节点只要有可靠的随机源，就可以各自生成 ID。

### UUIDv7 的结构

一个 UUIDv7 一共占 128 位。

```text
|      48 bits      | 4 bits | 12 bits | 2 bits |     62 bits     |
|    unix_ts_ms     |  ver   | rand_a  |  var   |     rand_b      |
```

| 字段 | 位数 | 用途 |
| --- | --- | --- |
| `unix_ts_ms` | 48 | Unix Epoch 毫秒时间戳 |
| `ver` | 4 | UUID 版本，固定为二进制 `0111` |
| `rand_a` | 12 | 随机数、亚毫秒时间或单调计数信息 |
| `var` | 2 | UUID 变体，固定为二进制 `10` |
| `rand_b` | 62 | 随机数据或实现定义的单调信息 |

48 位毫秒时间戳可以覆盖大约 8920 年。RFC 允许实现者在 `rand_a` 和 `rand_b` 中组合亚毫秒时间、计数器和随机数，因此不同库的同毫秒排序策略可能不完全相同。

Go 1.27 标准库把 12 位 `rand_a` 用作亚毫秒时间，并在同一进程里修正没有前进的时间值。最后 64 位由密码学安全随机源填充，变体字段占去其中两位，剩下至少 62 位随机数据。

### UUIDv7 的有序范围

UUIDv7 的时间字段位于高位，数据库可以把整个 128 位值当作不透明字节串排序。它带来的主要收益是索引局部性和按时间粗排，无需从 ID 中解析业务含义。

Go 1.27 的 `uuid.NewV7()` 会在一个进程内生成递增排序的 UUID，系统时钟向后跳变时不作这一保证。多个进程或多台机器之间没有共享计数器，同一毫秒内的 ID 也没有严格的全局先后顺序。

账单编号、监管流水号和严格消息顺序通常有单独的业务规则。UUIDv7 可以用作记录的唯一标识，业务序号仍由对应的序列或排序机制负责。

## UUIDv7 的 Go 实现

### 使用 Go 1.27 标准库

先把项目的 Go 版本设为 1.27。

```text
module example.com/uuidv7-demo

go 1.27
```

Go 1.27 的 `uuid` 是标准库包，不需要执行 `go get`。生成、解析和比较 UUIDv7 可以直接使用下面的代码。

```go
package main

import (
	"fmt"
	"log"
	"uuid"
)

func main() {
	first := uuid.NewV7()
	second := uuid.NewV7()

	parsed, err := uuid.Parse(first.String())
	if err != nil {
		log.Fatalf("parse UUIDv7: %v", err)
	}

	fmt.Printf("first: %s\n", first)
	fmt.Printf("second: %s\n", second)
	fmt.Printf("round trip: %t\n", parsed == first)
	fmt.Printf("in order: %t\n", first.Compare(second) < 0)
}
```

`uuid.NewV7()` 直接返回一个 `uuid.UUID`，调用方不用处理生成错误。`uuid.UUID` 的底层类型是 `[16]byte`，可以使用 `==` 判断两个值是否相同。需要比较排序位置时，使用 `Compare` 会更明确。

这里要显式调用 `NewV7()`。Go 1.27 中的 `uuid.New()` 仍等价于 `uuid.NewV4()`，它适合不关心具体版本的场景，不能替代有时间顺序要求的 UUIDv7。

### 在 MySQL 中保存 UUIDv7

原来使用 `BIGINT` 的主键列不能直接保存 UUIDv7。新表可以使用固定长度的 `BINARY(16)`。

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BINARY(16) NOT NULL UNIQUE
);
```

标准库中的 UUID 本身就是 16 字节数组。使用 `database/sql` 写入 MySQL 时，把它切成字节切片即可。

```go
import (
    "uuid"

    "gorm.io/datatypes"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    UserID datatypes.BinUUID `gorm:"not null;uniqueIndex"`
}
```



## 选择 UUIDv7 时要确认什么

UUIDv7 适合应用节点自行发号、数据分布在多个写入节点、主键需要按时间大体有序的系统。生成过程不依赖中心服务，也不用维护机器编号。

现有协议和表结构若只能接受 64 位整数，改用 UUIDv7 会带来字段、索引和接口格式的迁移成本。业务若要求严格的全局递增顺序，也要继续使用带协调机制的序列方案。

对大多数新建的 Go Web 项目，只要能够接受 128 位主键，直接使用 Go 1.27 标准库的 `uuid.NewV7()` 已经足够。代码很少，节点扩容不需要额外配置，数据库写入也比 UUIDv4 更友好。

## 参考资料

- [李文周的分布式 ID 生成器教程](https://liwenzhou.com/courses/go-web-advance/id-generator/)
- [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562.html)
- [Go 1.27 标准库 uuid 文档](https://pkg.go.dev/uuid)
- [Go 1.27 uuid 包源码](https://github.com/golang/go/blob/go1.27.0/src/uuid/uuid.go)
- [Go 1.27 发布说明](https://go.dev/doc/go1.27)
- [MySQL 8.4 UUID_TO_BIN 文档](https://dev.mysql.com/doc/refman/8.4/en/miscellaneous-functions.html#function_uuid-to-bin)
- [gofrs uuid v5 文档](https://pkg.go.dev/github.com/gofrs/uuid/v5)
