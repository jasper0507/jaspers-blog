---
title: "Gorm指南"
description: "基于 GORM v1.31.2 与 MySQL 的指南：连接、模型约定、迁移和关联。"
publishedAt: "2026-09-02T22:33:00+08:00"
tags:
  - Go
  - GORM
draft: false
# 禁止修改
id: 27
---

# Gorm指南

更新于2026/8/26，gorm版本为v1.31.2，基于mysql驱动示例

## 快速入门

### 安装

```bash
go get -u gorm.io/gorm
go get -u gorm.io/driver/sqlite
```

### 快速示例

```go
package main

import (
  "context"
  "gorm.io/driver/sqlite"
  "gorm.io/gorm"
)

type Product struct {
  gorm.Model
  Code  string
  Price uint
}

func main() {
  db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
  if err != nil {
    panic("连接数据库失败")
  }

  ctx := context.Background()

  // 自动建表
  db.AutoMigrate(&Product{})

  // 创建
  err = gorm.G[Product](db).Create(ctx, &Product{Code: "D42", Price: 100})

  // 查询
  product, err := gorm.G[Product](db).Where("id = ?", 1).First(ctx) // 查找对应主键的产品
  products, err := gorm.G[Product](db).Where("code = ?", "D42").Find(ctx) // 查找 code 为 D42 的所有产品

  // 更新 - 将产品价格更新为 200
  err = gorm.G[Product](db).Where("id = ?", product.ID).Update(ctx, "Price", 200)
  // 更新 - 更新多个字段
  err = gorm.G[Product](db).Where("id = ?", product.ID).Updates(ctx, Product{Code: "D42", Price: 100})

  // 删除 - 删除产品
  err = gorm.G[Product](db).Where("id = ?", product.ID).Delete(ctx)
}
```

---

## 连接数据库

```go
package database

import (
	"fmt"

	"github.com/jasper0507/bluebell/internal/config"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// 初始化 MySQL 数据库连接，并配置底层连接池
func Open(cfg *config.MySQLConfig) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(buildDSN(cfg)), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open MySQL: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get database connection pool: %w", err)
	}

	// 设置打开数据库连接的最大数量
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	// 设置空闲连接池中连接的最大数量
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	// 设置可以重新使用连接的最大时间
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	return db, nil
}

// 根据config构建 MySQL DSN
func buildDSN(cfg *config.MySQLConfig) string {
	return fmt.Sprintf(
		"%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=true&loc=Local",
		cfg.Username,
		cfg.Password,
		cfg.Host,
		cfg.Port,
		cfg.Database,
	)
}

// 关闭 GORM 底层的数据库连接池
func Close(db *gorm.DB) error {
	if db == nil {
		return nil
	}

	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("get database connection pool: %w", err)
	}

	if err := sqlDB.Close(); err != nil {
		return fmt.Errorf("close MySQL: %w", err)
	}

	return nil
}

```

---

## 模型定义

### 字段标签

| 标签名                 | 说明                                                         |
| :--------------------- | :----------------------------------------------------------- |
| column                 | 指定 db 列名                                                 |
| type                   | 列数据类型，推荐使用兼容性好的通用类型，例如：所有数据库都支持 bool、int、uint、float、string、time、bytes 并且可以和其他标签一起使用，例如：`not null`、`size`, `autoIncrement`… 像 `varbinary(8)` 这样指定数据库数据类型也是支持的。在使用指定数据库数据类型时，它需要是完整的数据库数据类型，如：`MEDIUMINT UNSIGNED not NULL AUTO_INCREMENT` |
| serializer             | 指定将数据序列化或反序列化到数据库中的序列化器, 例如: `serializer:json/gob/unixtime` |
| size                   | 定义列数据类型的大小或长度，例如 `size: 256`                 |
| primaryKey             | 将列定义为主键                                               |
| unique                 | 将列定义为唯一键                                             |
| default                | 定义列的默认值                                               |
| precision              | 指定列的精度                                                 |
| scale                  | 指定列大小                                                   |
| not null               | 指定列为 NOT NULL                                            |
| autoIncrement          | 指定列为自动增长                                             |
| autoIncrementIncrement | 自动步长，控制连续记录之间的间隔                             |
| embedded               | 展开嵌套结构体                                               |
| embeddedPrefix         | 嵌入字段的列名前缀                                           |
| autoCreateTime         | 创建时追踪当前时间，对于 `int` 字段，它会追踪时间戳秒数，您可以使用 `nano`/`milli` 来追踪纳秒、毫秒时间戳，例如：`autoCreateTime:nano` |
| autoUpdateTime         | 创建/更新时追踪当前时间，对于 `int` 字段，它会追踪时间戳秒数，您可以使用 `nano`/`milli` 来追踪纳秒、毫秒时间戳，例如：`autoUpdateTime:milli` |
| index                  | 根据参数创建索引，多个字段使用相同的名称则创建复合索引，查看 [索引](https://gorm.io/zh_CN/docs/indexes.html) 获取详情 |
| uniqueIndex            | 与 `index` 相同，但创建的是唯一索引                          |
| check                  | 创建检查约束，例如 `check:age > 13`，查看 [约束](https://gorm.io/zh_CN/docs/constraints.html) 获取详情 |
| <-                     | 设置字段写入的权限， `<-:create` 只创建、`<-:update` 只更新、`<-:false` 无写入权限、`<-` 创建和更新权限 |
| ->                     | 设置字段读的权限，`->:false` 无读权限                        |
| -                      | 忽略该字段，`-` 表示无读写，`-:migration` 表示无迁移权限，`-:all` 表示无读写迁移权限 |
| comment                | 迁移时为字段添加注释                                         |

### 约定

1. **主键**：GORM 使用一个名为`ID` 的字段作为每个模型的默认主键。
2. **表名**：默认情况下，GORM 将结构体名称转换为 `snake_case` 并为表名加上复数形式。 For instance, a `User` struct becomes `users` in the database, and a `GormUserName` becomes `gorm_user_names`.
3. **列名**：GORM 自动将结构体字段名称转换为 `snake_case` 作为数据库中的列名。
4. **时间戳字段**：GORM使用字段 `CreatedAt` 和 `UpdatedAt` 来自动跟踪记录的创建和更新时间。

详细内容请参考[文档](https://gorm.io/zh_CN/docs/conventions.html)

### `gorm.Model`

GORM提供了一个预定义的结构体，名为`gorm.Model`，其中包含常用字段：

```go
// gorm.Model 的定义
type Model struct {
  ID        uint           `gorm:"primaryKey"`
  CreatedAt time.Time
  UpdatedAt time.Time
  DeletedAt gorm.DeletedAt `gorm:"index"`
}
```

- **将其嵌入结构体中**: 可以直接在结构体中嵌入 `gorm.Model` ，以便自动包含这些字段。 这对于在不同模型之间保持一致性并利用GORM内置的约定非常有用，请参考[嵌入结构](https://gorm.io/zh_CN/docs/models.html#embedded_struct)。
- **包含的字段**：
  - `ID` ：每个记录的唯一标识符（主键）。
  - `CreatedAt` ：在创建记录时自动设置为当前时间。
  - `UpdatedAt`：每当记录更新时，自动更新为当前时间。
  - `DeletedAt`：用于软删除（将记录标记为已删除，而实际上并未从数据库中删除）。

---

## 迁移

### AutoMigrate

AutoMigrate 用于自动迁移 schema，保持您的 schema 是最新的。

> **注意：** AutoMigrate 会创建表、缺失的外键、约束、列和索引。 It will change existing column’s type if its size, precision changed, or if it’s changing from non-nullable to nullable. 出于保护您数据的目的，它 **不会** 删除未使用的列

```go
db.AutoMigrate(&User{})

db.AutoMigrate(&User{}, &Product{}, &Order{})

// 创建表时添加后缀
db.Set("gorm:table_options", "ENGINE=InnoDB").AutoMigrate(&User{})
```

> **注意** AutoMigrate 会自动创建数据库外键约束，您可以在初始化时禁用此功能，例如：

```go
db, err := gorm.Open(sqlite.Open("gorm.db"), &gorm.Config{
  DisableForeignKeyConstraintWhenMigrating: true,
})
```

---

## 关联

### Belongs to

#### 多对一 

```go
// `User` 属于 `Company`，`CompanyID` 是外键
type User struct {
  gorm.Model
  Name      string
  CompanyID int
  Company   Company
}

type Company struct {
  ID   int
  Name string
}
```

每个 User 属于一个 Company，而一个 Company 可以对应多个 User

- `Company Company`是 **GORM 的关联字段**。

  它不对应 `users` 表中的某一列，而是告诉 GORM：`User` 与 `Company` 存在关联，并且可以把查询到的完整公司数据放到这里。

- GORM 先根据 `Company Company` 识别关联，再按默认命名约定找到 `CompanyID` 作为外键

`Company Company` 字段最直观的影响是，GORM 会不会把关联对象填进这个字段里，影响Gorm的操作。

例如执行：

```go
db.Preload("CreditCard").First(&user, 1)
```

查询结果可能就是：

``` 
User{
	ID:        1,
	Name:      "小明",
	CompanyID: 10,

	Company: Company{
		ID:   10,
		Name: "Google",
	},
}
```

#### 重写外键

例如，定义一个User实体属于Company实体，那么外键的名字一般使用CompanyID。

GORM提供自定义外键名字的方式，如下例所示。

```go
type User struct {
  gorm.Model
  Name         string
  CompanyRefer int
  Company      Company `gorm:"foreignKey:CompanyRefer"`
  // 使用 CompanyRefer 作为外键
}

type Company struct {
  ID   int
  Name string
}
```

### Has One

`has one` 与另一个模型建立一对一的关联，但它和一对一关系有些许不同。 这种关联表明一个模型的每个实例都包含或拥有另一个模型的一个实例。

> 数据库层面如果要保证“一个 User 最多只能对应一个 CreditCard”，需要给外键 UserID 添加 UNIQUE 约束。

#### 声明

例如，您的应用包含 user 和 credit card 模型，且每个 user 只能有一张 credit card。

```go
// User 有一张 CreditCard，UserID 是外键
type User struct {
  gorm.Model
  CreditCard CreditCard
}

type CreditCard struct {
  gorm.Model
  Number string
  UserID uint
}
```

#### 检索

```go
// 检索用户列表并预加载信用卡
func GetAll(db *gorm.DB) ([]User, error) {
    var users []User
    err := db.Model(&User{}).Preload("CreditCard").Find(&users).Error
    return users, err
}
```

### Has Many

`has many` 与另一个模型建立了一对多的连接。 不同于 `has one`，拥有者可以有零或多个关联模型。

例如，每个 user 可以有多张 credit card。

#### 声明

```go
// User 有多张 CreditCard，UserID 是外键
type User struct {
  gorm.Model
  CreditCards []CreditCard
}

type CreditCard struct {
  gorm.Model
  Number string
  UserID uint
}
```

#### 检索

```go
// 检索用户列表并预加载信用卡
func GetAll(db *gorm.DB) ([]User, error) {
    var users []User
    err := db.Model(&User{}).Preload("CreditCards").Find(&users).Error
    return users, err
}
```

#### Many to Many

Many to Many 会在两个 model 中添加一张连接表。

例如，您的应用包含了 user 和 language，且一个 user 可以说多种 language，多个 user 也可以说一种 language。

```go
// User 拥有并属于多种 language，`user_languages` 是连接表
type User struct {
  gorm.Model
  Languages []Language `gorm:"many2many:user_languages;"`
}

type Language struct {
  gorm.Model
  Name string
}
```

当使用 GORM 的 `AutoMigrate` 为 `User` 创建表时，GORM 会自动创建连接表

参考文档:

- [Gorm官方文档](https://gorm.io/zh_CN/docs/)
