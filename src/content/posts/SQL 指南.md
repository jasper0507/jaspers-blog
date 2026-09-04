---
title: "SQL 指南"
description: "从数据模型讲到关系模型的主键、外键和索引，以及查询、修改、删除和常用归纳。"
publishedAt: "2026-08-29T23:06:00+08:00"
tags:
  - SQL
draft: false
# 禁止修改
id: 26
---

SQL(Structured Query Language)是访问和处理关系数据库的计算机标准语言，无论用什么编程语言编写程序，只要涉及到操作关系数据库，都必须通过SQL来完成。

# 数据库概述

## 数据模型

数据库按照数据结构来组织、存储和管理数据，实际上，数据库一共有三种模型：

- 层次模型
- 网状模型
- 关系模型

层次模型就是以“上下级”的层次关系来组织数据的一种方式，层次模型的数据结构看起来就像一颗树：

<img src="https://imgbed.jasper0507.me/file/typora/1787710385724_20260826101258738.png" alt="层次模型" style="zoom: 50%;" />

网状模型把每个数据节点和其他很多节点都连接起来，它的数据结构看起来就像很多城市之间的路网：

<img src="https://imgbed.jasper0507.me/file/typora/1787710638376_20260826101714567.png" alt="image-20260826101713876" style="zoom:50%;" />

关系模型把数据看作是一个二维表格，任何数据都可以通过行号+列号来唯一确定，它的数据模型看起来就是一个Excel表：

<img src="https://imgbed.jasper0507.me/file/typora/1787710810331_20260826102005136.png" alt="image-20260826102004429" style="zoom:50%;" />

## 数据类型

| 名称           | 类型         | 说明                         | 常见用途                   |
| -------------- | ------------ | ---------------------------- | -------------------------- |
| `BIGINT`       | 大整数       | 8 字节整数                   | 用户 ID、订单 ID、主键     |
| `INT`          | 整数         | 4 字节整数                   | 数量、普通编号             |
| `TINYINT`      | 小整数       | 1 字节整数                   | 状态、类型、布尔值         |
| `VARCHAR(N)`   | 变长字符串   | 最多存储 N 个字符            | 用户名、邮箱、标题         |
| `TEXT`         | 长文本       | 存储较长字符串               | 文章正文、描述             |
| `DECIMAL(M,D)` | 高精度小数   | `M` 是总位数，`D` 是小数位数 | 金额、价格                 |
| `DATETIME`     | 日期时间     | 例如 `2026-08-26 10:30:00`   | 创建时间、业务时间         |
| `TIMESTAMP`    | 时间戳       | 日期时间，可进行时区转换     | `created_at`、`updated_at` |
| `JSON`         | JSON 数据    | MySQL 原生 JSON 类型         | 配置、动态结构数据         |
| `CHAR(N)`      | 定长字符串   | 长度固定的字符串             | 固定长度编码、哈希         |
| `BOOLEAN`      | 布尔类型     | MySQL 中等价于 `TINYINT(1)`  | 是否启用、开关             |
| `DATE`         | 日期         | 例如 `2026-08-26`            | 生日、发布日期             |
| `TIME`         | 时间         | 例如 `10:30:00`              | 时间、持续时长             |
| `DOUBLE`       | 双精度浮点数 | 8 字节，存储近似值           | 科学计算、统计数据         |
| `FLOAT`        | 单精度浮点数 | 4 字节，存储近似值           | 精度要求不高的小数         |
| `SMALLINT`     | 小整数       | 2 字节整数                   | 较小范围的数值             |
| `ENUM`         | 枚举         | 只能取预先定义的值           | 状态、类别                 |
| `BLOB`         | 二进制大对象 | 存储二进制数据               | 文件、图片等               |
| `BINARY(N)`    | 定长二进制   | 固定长度二进制数据           | 哈希、二进制标识           |
| `VARBINARY(N)` | 变长二进制   | 可变长度二进制数据           | 二进制内容                 |
| `TINYTEXT`     | 短文本       | 最大约 255 字节              | 很短的文本                 |
| `MEDIUMTEXT`   | 中长文本     | 最大约 16 MB                 | 较长文章                   |
| `LONGTEXT`     | 超长文本     | 最大约 4 GB                  | 超大文本                   |
| `YEAR`         | 年份         | 存储年份                     | 出版年份等                 |
| `SET`          | 集合         | 可同时选择多个预定义值       | 少量固定多选值             |

## 分类

SQL 常见可以分成这几类：

- **DDL（Data Definition Language，数据定义语言）**
   用来定义和修改数据库结构，例如创建表、修改表、删除表。常见语句有 `CREATE`、`ALTER`、`DROP`、`TRUNCATE`。
- **DML（Data Manipulation Language，数据操作语言）**
   用来修改表中的数据，也就是增、删、改。常见语句有 `INSERT`、`UPDATE`、`DELETE`。
- **DQL（Data Query Language，数据查询语言）**
   用来查询数据，核心语句是 `SELECT`。有些资料会把 DQL 归到广义的 DML 中。
- **DCL（Data Control Language，数据控制语言）**
   用来控制数据库用户的权限。常见语句有 `GRANT`、`REVOKE`。
- **TCL（Transaction Control Language，事务控制语言）**
   用来控制事务的提交和回滚。常见语句有 `COMMIT`、`ROLLBACK`、`SAVEPOINT`。

---

# 关系模型

表的每一行称为记录（Record），记录是一个逻辑意义上的数据。

表的每一列称为字段（Column），同一个表的每一行记录都拥有相同的若干字段。

> 字段定义了数据类型，以及是否允许为`NULL`。
>
> 注意`NULL`表示字段数据不存在。一个整型字段如果为`NULL`不表示它的值为`0`，同样的，一个字符串型字段为`NULL`也不表示它的值为空串`''`。
>
> > 通常情况下，字段应该避免允许为NULL。不允许为NULL可以简化查询条件，加快查询速度，也利于应用程序读取数据后无需判断是否为NULL。

## 主键

对于关系表，通常需要有一个能够唯一标识每条记录的字段或字段组合，这称为主键。

主键的值不能重复，也不能为 `NULL`。

选取主键的一个基本原则是：**不使用任何业务相关的字段作为主键。**

> 记录一旦插入到表中，主键最好不要再修改，因为主键是用来唯一定位记录的，修改了主键，会造成一系列的影响。

我们一般把主键字段命名为 `id`。常见的 `id` 类型有两类：

- 自增整数类型：数据库在插入数据时自动生成递增的主键值，使用简单，适合大多数单库单表场景。

- UUID/GUID 类型：由程序或数据库生成全局唯一标识符，常见形式如 `8f55d96b-8acc-4636-8cb8-76bf8abc2f57`。不同 UUID 版本生成规则不同，常见的有基于随机数的版本。

### 联合主键

关系数据库实际上还允许通过多个字段唯一标识记录，即两个或更多的字段都设置为主键，这种主键被称为联合主键。

对于联合主键，允许一列有重复，只要不是所有主键列都重复即可：

| id_num | id_type | other columns... |
| ------ | ------- | ---------------- |
| 1      | A       | ...              |
| 2      | A       | ...              |
| 2      | B       | ...              |

如果我们把上述表的`id_num`和`id_type`这两列作为联合主键，那么上面的3条记录都是允许的，因为没有两列主键组合起来是相同的。

> 没有必要的情况下，我们尽量不使用联合主键，因为它给关系表带来了复杂度的上升。

## 外键

**外键**：子表中用于引用父表中某个键的字段或字段组合，用来建立表与表之间的关联，并保证引用数据的一致性。
 外键字段的值通常必须能在父表被引用字段中找到，但外键本身可以重复，也可以根据约束允许为 `NULL`。

### 一对多

当我们用主键唯一标识记录时，我们就可以在`students`表中确定任意一个学生的记录：

| id   | name | other columns... |
| ---- | ---- | ---------------- |
| 1    | 小明 | ...              |
| 2    | 小红 | ...              |

我们还可以在`classes`表中确定任意一个班级记录：

| id   | name | other columns... |
| ---- | ---- | ---------------- |
| 1    | 一班 | ...              |
| 2    | 二班 | ...              |

由于一个班级可以有多个学生，为了表达这种一对多的关系，我们需要在`students`表中加入一列`class_id`，让它的值与`classes`表的某条记录相对应：

| id   | class_id | name | other columns... |
| ---- | -------- | ---- | ---------------- |
| 1    | 1        | 小明 | ...              |
| 2    | 1        | 小红 | ...              |
| 5    | 2        | 小白 | ...              |

这样，我们就可以根据`class_id`这个列直接定位出一个`students`表的记录应该对应到`classes`的哪条记录。

在`students`表中，通过`class_id`的字段，**可以把数据与另一张表关联起来**，这种列称为`外键`。

外键并不是通过列名实现的，而是通过定义外键约束实现的：

```sql
ALTER TABLE students
ADD CONSTRAINT fk_class_id
FOREIGN KEY (class_id)
REFERENCES classes (id);
```

- 外键约束的名称`fk_class_id`可以任意
- `FOREIGN KEY (class_id)`指定了`class_id`作为外键
- `REFERENCES classes (id)`指定了这个外键将关联到`classes`表的`id`列（即`classes`表的主键）。

通过定义外键约束，关系数据库可以保证无法插入无效的数据。即如果`classes`表不存在`id=99`的记录，`students`表就无法插入`class_id=99`的记录。

> 由于外键约束会降低数据库的性能，大部分互联网应用程序为了追求速度，并不设置外键约束，而是仅靠应用程序自身来保证逻辑的正确性。
>
> 这种情况下，`class_id`仅仅是一个普通的列，只是它起到了外键的作用而已。

要删除一个外键约束，也是通过`ALTER TABLE`实现的：

```sql
ALTER TABLE students
DROP FOREIGN KEY fk_class_id;
```

> 注意：删除外键约束并没有删除外键这一列。删除列是通过`DROP COLUMN ...`实现的。

### 多对多

例如：一个老师可以对应多个班级，一个班级也可以对应多个老师，因此，班级表和老师表存在多对多关系。

多对多关系实际上是通过两个一对多关系实现的，即通过一个中间表，关联两个一对多关系，就形成了多对多关系：

`teachers`表：

| id   | name   |
| ---- | ------ |
| 1    | 张老师 |
| 2    | 王老师 |
| 3    | 李老师 |
| 4    | 赵老师 |

`classes`表：

| id   | name |
| ---- | ---- |
| 1    | 一班 |
| 2    | 二班 |

中间表`teacher_class`关联两个一对多关系：

| id   | teacher_id | class_id |
| ---- | ---------- | -------- |
| 1    | 1          | 1        |
| 2    | 1          | 2        |
| 3    | 2          | 1        |
| 4    | 2          | 2        |
| 5    | 3          | 1        |
| 6    | 4          | 2        |

通过中间表`teacher_class`可知`teachers`到`classes`的关系：

- `id=1`的张老师对应`id=1,2`的一班和二班；
- `id=2`的王老师对应`id=1,2`的一班和二班；
- `id=3`的李老师对应`id=1`的一班；
- `id=4`的赵老师对应`id=2`的二班。

同理可知`classes`到`teachers`的关系：

- `id=1`的一班对应`id=1,2,3`的张老师、王老师和李老师；
- `id=2`的二班对应`id=1,2,4`的张老师、王老师和赵老师；

因此，通过中间表，我们就定义了一个“多对多”关系。

### 一对一

一对一关系表示：一个表中的一条记录，最多对应另一个表中的一条记录。

例如，一个学生最多有一份联系方式。可以把联系方式单独放在 `contacts` 表中，通过 `student_id` 关联 `students.id`：

```text
Student 1 ─── Contact 1
Student 2 ─── Contact 2
Student 3 ─── 无
```

这里 Student 可以没有 Contact，但每个 Contact 只能属于一个 Student。为了保证严格的一对一，`contacts.student_id` 通常需要加 `UNIQUE` 唯一约束。

一对一通常用于两种情况：一是某些字段并非每条记录都有，例如学生可能没有联系方式；二是把一个字段很多的表拆成“常用信息表”和“详细信息表”，减少平时查询时读取的不必要字段。

## 索引

索引就是数据库额外建立的查找结构，用额外的空间和写入成本，换取更快的查询速度。

通过使用索引，可以让数据库系统不必扫描整个表，而是直接定位到符合条件的记录，这样就大大加快了查询速度。

例如，对于`students`表：

| id   | class_id | name | gender | score |
| ---- | -------- | ---- | ------ | ----- |
| 1    | 1        | 小明 | M      | 90    |
| 2    | 1        | 小红 | F      | 95    |
| 3    | 1        | 小军 | M      | 88    |

如果要经常根据`score`列进行查询，就可以对`score`列创建索引：

```sql
ALTER TABLE students
ADD INDEX idx_score (score);
```

使用`ADD INDEX idx_score (score)`就创建了一个名称为`idx_score`，使用列`score`的索引。索引名称是任意的，索引如果有多列，可以在括号里依次写上，例如：

```sql
ALTER TABLE students
ADD INDEX idx_name_score (name, score);
```



索引的效率取决于索引列的值是否散列，即该列的值如果越互不相同，那么索引效率越高。反过来，如果记录的列存在大量相同的值，例如`gender`列，大约一半的记录值是`M`，另一半是`F`，因此，对该列创建索引就没有意义。

可以对一张表创建多个索引。索引的优点是提高了查询效率，缺点是在插入、更新和删除记录时，需要同时修改索引，因此，索引越多，插入、更新和删除记录的速度就越慢。

对于主键，关系数据库会自动对其创建主键索引。使用主键索引的效率是最高的，因为主键会保证绝对唯一。

### 唯一索引

唯一索引既能保证某列或多列的值不能重复，也可以像普通索引一样加快查询。

```sql
ALTER TABLE students
ADD UNIQUE INDEX uni_name (name);
```

对于身份证号、邮箱等具有业务含义但要求唯一的字段，通常使用唯一约束或唯一索引，而不直接作为主键。

在 MySQL 中：

```sql
ADD UNIQUE INDEX uni_name (name);
```

和：

```sql
ADD CONSTRAINT uni_name UNIQUE (name);
```

实际效果基本一致，`UNIQUE` 约束通常也会通过唯一索引实现。

索引不会改变 SQL 的使用方式。有索引时数据库会自动选择是否使用索引加快查询；没有索引时 SQL 仍然可以执行，只是可能需要全表扫描，速度更慢。

---

# 查询数据

## 基本查询

语法：`SELECT * FROM <表名>`

假设表名是`students`，要查询`students`表的所有行和所有列的数据，我们用如下SQL语句：

```sql
-- 查询students表的所有数据
SELECT * FROM students;
```

结果：

| id   | class_id | name | gender | score |
| ---- | -------- | ---- | ------ | ----- |
| 1    | 1        | 小明 | M      | 90    |
| 2    | 1        | 小红 | F      | 95    |
| 3    | 1        | 小军 | M      | 88    |

> `SELECT`是关键字，表示将要执行一个查询，`*`表示“所有列”，`FROM`表示将要从哪个表查询

SELECT查询的结果是一个二维表。

## 条件查询

语法：`SELECT * FROM <表名> WHERE <条件表达式>`

SELECT语句可以通过`WHERE`条件来设定查询条件，查询结果是满足查询条件的记录。

例如，要指定条件“分数在80分或以上的学生”，写成`WHERE`条件就是`SELECT * FROM students WHERE score >= 80`。

> 其中，`WHERE`关键字后面的`score >= 80`就是条件。`score`是列名，该列存储了学生的成绩，因此，`score >= 80`就筛选出了指定条件的记录：



条件表达式可以用`<条件1> AND <条件2>`表达满足条件1并且满足条件2。

例如，符合条件“分数在80分或以上”，并且还符合条件“男生”，把这两个条件写出来：

- 条件1：根据score列的数据判断：`score >= 80`；
- 条件2：根据gender列的数据判断：`gender = 'M'`，注意`gender`列存储的是字符串，需要用单引号括起来。

就可以写出`WHERE`条件：`score >= 80 AND gender = 'M'`：



第二种条件是`<条件1> OR <条件2>`，表示满足条件1或者满足条件2。

例如，把上述`AND`查询的两个条件改为`OR`，查询结果就是“分数在80分或以上”或者“男生”，满足任意之一的条件即选出该记录：

`SELECT * FROM students WHERE score >= 80 OR gender = 'M';`



第三种条件是`NOT <条件>`，表示“不符合该条件”的记录。

例如，写一个“不是2班的学生”：

`SELECT * FROM students WHERE NOT class_id = 2;`



要组合三个或者更多的条件，就需要用小括号`()`表示如何进行条件运算。例如，编写一个复杂的条件：分数在80以下或者90以上，并且是男生：

`SELECT * FROM students WHERE (score < 80 OR score > 90) AND gender = 'M';`


## 投影查询

如果我们只希望返回某些列的数据，而不是所有列的数据，我们可以用`SELECT 列1, 列2, 列3 FROM ...`，让结果集仅包含指定列。这种操作称为投影查询。

例如，从`students`表中返回`id`、`score`和`name`这三列：

`SELECT id, score, name FROM students;`



使用投影查询时，还可以给每一列起个别名，这样，结果集的列名就可以与原表的列名不同。它的语法是`SELECT 列1 别名1, 列2 别名2, 列3 别名3 FROM ...`。

例如，以下`SELECT`语句将列名`score`重命名为`points`，而`id`和`name`列名保持不变：

`SELECT id, score points, name FROM students;`

## 排序

语法：`SELECT 列名
FROM 表名
ORDER BY 列名 ASC;`

> 其中 ASC   升序，默认值
> DESC  降序

例如按照成绩从低到高进行排序：

`SELECT id, name, gender, score FROM students ORDER BY score;`



如果`score`列有相同的数据，要进一步排序，可以继续添加列名。

例如，先按`score`列倒序，如果有相同分数的，再按`gender`列排序：

`SELECT id, name, gender, score FROM students ORDER BY score DESC, gender;`



如果有`WHERE`子句，那么`ORDER BY`子句要放到`WHERE`子句后面。例如，查询一班的学生成绩，并按照倒序排序：

```sql
-- 带WHERE条件的ORDER BY:
SELECT id, name, gender, score
FROM students
WHERE class_id = 1
ORDER BY score DESC;
```

## 分页查询

要实现分页功能，实际上就是从结果集中显示第1~100条记录作为第1页，显示第101~200条记录作为第2页，以此类推。

`LIMIT` 用于限制查询结果返回的数据条数，`OFFSET` 用于指定跳过前面的多少条数据。两者配合可以实现分页查询。

语法：

```sql
SELECT 字段
FROM 表名
LIMIT 返回条数 OFFSET 跳过条数;
```

分页时：

```sql
LIMIT 每页条数 OFFSET (页码 - 1) * 每页条数;
```

比如查询第 2 页数据，每页显示 100 条：

```sql
SELECT *
FROM users
ORDER BY id
LIMIT 100 OFFSET 100;
```

`OFFSET 100` 表示先跳过前 100 条记录，`LIMIT 100` 表示再返回最多 100 条记录，因此得到的是第 101～200 条数据。

> 实际分页查询通常配合 `ORDER BY` 使用，保证每次分页的数据顺序稳定。
>
> `OFFSET`超过了查询的最大数量并不会报错，而是得到一个空的结果集。
>
> 使用`LIMIT <M> OFFSET <N>`分页时，随着`N`越来越大，查询效率也会越来越低。

## 聚合查询

对于统计总数、平均数这类计算，SQL提供了专门的聚合函数，使用聚合函数进行查询，就是聚合查询，它可以快速获得结果。

以查询`students`表一共有多少条记录为例，我们可以使用SQL内置的`COUNT()`函数查询：

`SELECT COUNT(*) FROM students;`

`COUNT(*)`表示查询所有列的行数，要注意聚合的计算结果虽然是一个数字，但查询的结果仍然是一个二维表，只是这个二维表只有一行一列，并且列名是`COUNT(*)`。



通常，使用聚合查询时，我们应该给列名设置一个别名，便于处理结果：

`SELECT COUNT(*) num FROM students;`

(使用聚合查询并设置结果集的列名为num)



聚合查询同样可以使用`WHERE`条件，因此我们可以方便地统计出有多少男生、多少女生、多少80分以上的学生等：

`SELECT COUNT(*) boys FROM students WHERE gender = 'M';`



### 分组聚合

分组聚合是指先使用 `GROUP BY` 按某个字段把查询结果分成多个组，再对每个组分别使用聚合函数进行统计。

语法：

```sql
SELECT 分组字段, 聚合函数(字段)
FROM 表名
GROUP BY 分组字段;
```

假设 `students` 表中有 `class` 和 `score` 字段，统计每个班级的学生人数：

```sql
SELECT class, COUNT(*) AS student_count
FROM students
GROUP BY class;
```

`GROUP BY class` 会先按照 `class` 字段把学生分组。

例如原始数据是：

| name | class |
| ---- | ----- |
| 小红 | 1班   |
| 小李 | 2班   |
| 小张 | 2班   |

分组后相当于：

```markdown
1班：小红
2班：小李、小张
```

然后 `COUNT(*)` 会分别统计每个组中的记录数量，因此结果为：

| class | student_count |
| ----- | ------------- |
| 1班   | 1             |
| 2班   | 2             |

## 多表查询

多表查询是指在一次 `SELECT` 查询中，同时从两个或多个表中获取数据。

查询多张表的语法是：`SELECT * FROM <表1> <表2>`。

例如，同时从`students`表和`classes`表查询数据，可以这么写：

`SELECT * FROM students, classes;`

> 查询的结果也是一个二维表。
>
> 结果集的列数是`students`表和`classes`表的列数之和，行数是`students`表和`classes`表的行数之积。

结果：

| id   | class_id | name | gender | score | id   | name |
| ---- | -------- | ---- | ------ | ----- | ---- | ---- |
| 1    | 1        | 小明 | M      | 90    | 1    | 一班 |
| 1    | 1        | 小明 | M      | 90    | 2    | 二班 |
| 1    | 1        | 小明 | M      | 90    | 3    | 三班 |
| 1    | 1        | 小明 | M      | 90    | 4    | 四班 |
| 2    | 1        | 小红 | F      | 95    | 1    | 一班 |
| 2    | 1        | 小红 | F      | 95    | 2    | 二班 |

上述查询的结果集有两列`id`和两列`name`，两列`id`是因为其中一列是`students`表的`id`，而另一列是`classes`表的`id`，但是在结果集中，不好区分。

要解决这个问题，我们仍然可以利用投影查询的“设置列的别名”来给两个表各自的`id`和`name`列起别名：

```sql
SELECT
    students.id sid,
    students.name,
    students.gender,
    students.score,
    classes.id cid,
    classes.name cname
FROM students, classes;
```

| sid  | name | gender | score | cid  | cname |
| ---- | ---- | ------ | ----- | ---- | ----- |
| 1    | 小明 | M      | 90    | 1    | 一班  |
| 1    | 小明 | M      | 90    | 2    | 二班  |
| 1    | 小明 | M      | 90    | 3    | 三班  |
| 1    | 小明 | M      | 90    | 4    | 四班  |
| 2    | 小红 | F      | 95    | 1    | 一班  |
| 2    | 小红 | F      | 95    | 2    | 二班  |

但是，用`表名.列名`这种方式列举两个表的所有列实在是很麻烦，所以SQL还允许给表设置一个别名，让我们在投影查询中引用起来稍微简洁一点：

```sql
SELECT
    s.id sid,
    s.name,
    s.gender,
    s.score,
    c.id cid,
    c.name cname
FROM students s, classes c;
```

> 多表查询的结果集可能非常巨大，要小心使用。

## 连接查询

INNER JOIN/JSON：只保留两张表中能够匹配的数据

<img src="https://imgbed.jasper0507.me/file/typora/1788006063435_20260829202050225.png" alt="image-20260829202042780" style="zoom: 80%;" />

LEFT OUTER JOIN：左表全部保留，右表匹配不到则为 `NULL`

<img src="https://imgbed.jasper0507.me/file/typora/1788006139351_20260829202208225.png" alt="image-20260829202207330" style="zoom:80%;" />

RIGHT OUTER JOIN：选出右表存在的记录

<img src="https://imgbed.jasper0507.me/file/typora/1788006168926_20260829202242557.png" alt="image-20260829202241706" style="zoom:80%;" />

假设我们希望结果集同时包含所在班级的名称，可以使用最常用的一种内连接——INNER JOIN来实现：

```sql
SELECT s.id, s.name, s.class_id, c.name class_name, s.gender, s.score
FROM students s
INNER JOIN classes c
ON s.class_id = c.id;
```

INNER/OUTER JOIN查询的写法是：

1. 先确定主表，仍然使用`FROM <表1>`的语法；
2. 再确定需要连接的表，使用`INNER/OUTER JOIN <表2>`的语法；
3. 然后确定连接条件，使用`ON <条件...>`，这里的条件是`s.class_id = c.id`，表示`students`表的`class_id`列与`classes`表的`id`列相同的行需要连接；
4. 可选：加上`WHERE`子句、`ORDER BY`等子句。

---

# 修改数据

## 插入数据

当我们需要向数据库表中插入一条新记录时，就必须使用`INSERT`语句。

语法是：

```sql
INSERT INTO <表名> (字段1, 字段2, ...) VALUES (值1, 值2, ...);
```

例如，我们向`students`表插入一条新记录，先列举出需要插入的字段名称，然后在`VALUES`子句中依次写出对应字段的值：

`INSERT INTO students (class_id, name, gender, score) VALUES (2, '大牛', 'M', 80);`

> `INSERT`字段顺序不必和数据库表的字段顺序一致，但值的顺序必须和`INSERT`字段顺序一致。



还可以一次性添加多条记录，只需要在`VALUES`子句中指定多个记录值，每个记录是由`(...)`包含的一组值，每组值用逗号`,`分隔：

```sql
INSERT INTO students (class_id, name, gender, score) VALUES
  (1, '大宝', 'M', 87),
  (2, '二宝', 'M', 81),
  (3, '三宝', 'M', 83);
```

## 更新数据

如果要更新数据库表中的记录，我们就必须使用`UPDATE`语句。

语法是：

```sql
UPDATE <表名> SET 字段1=值1, 字段2=值2, ... WHERE ...;
```

例如，我们想更新`students`表`id=1`的记录的`name`和`score`这两个字段，先写出`UPDATE students SET name='大牛', score=66`，然后在`WHERE`子句中写出需要更新的行的筛选条件`id=1`：

`UPDATE students SET name='大牛', score=66 WHERE id=1;`



也可以一次更新多条记录：

`UPDATE students SET name='小牛', score=77 WHERE id>=5 AND id<=7;`



在`UPDATE`语句中，更新字段时可以使用表达式。例如，把所有80分以下的同学的成绩加10分：

`UPDATE students SET score=score+10 WHERE score<80;`

或者先用 `WHERE` 找出所有及格学生，再根据分数决定更新成 `excellent` 还是 `pass`：

```sql
UPDATE students
SET status = IF(score >= 90, 'excellent', 'pass')
WHERE score >= 60;
```



特别小心的是，`UPDATE`语句可以没有`WHERE`条件，例如：

```sql
UPDATE students SET score=60;
```

这时，整个表的所有记录都会被更新。所以，在执行`UPDATE`语句时要非常小心，最好先用`SELECT`语句来测试`WHERE`条件是否筛选出了期望的记录集，然后再用`UPDATE`更新。

---

# 删除数据

如果要删除数据库表中的记录，我们可以使用`DELETE`语句。

语法：
`DELETE FROM <表名> WHERE ...;`

例如，我们想删除`students`表中`id=1`的记录：

`DELETE FROM students WHERE id=1;`

特别小心的是，和`UPDATE`类似，不带`WHERE`条件的`DELETE`语句会删除整个表的数据：

```sql
DELETE FROM students;
```

---

# 常用归纳

## 常见语句顺序

```sql
SELECT 字段
FROM 表名
WHERE 条件
GROUP BY 分组字段
HAVING 分组后的条件
ORDER BY 排序字段
LIMIT 数量 OFFSET 偏移量;
```

## 逻辑执行顺序

```sql
FROM       找数据
WHERE      筛行
GROUP BY   分组
HAVING     筛组
SELECT     选列
ORDER BY   排序
LIMIT      截取
```

## 常用表达式

| 类型         | 常用表达式 / 函数         | 作用                           | 示例                                                |
| ------------ | ------------------------- | ------------------------------ | --------------------------------------------------- |
| 算术表达式   | `+ - * /`                 | 对数值进行加、减、乘、除运算   | `score + 10`                                        |
| 比较表达式   | `= <> > >= < <=`          | 比较两个值，结果为真或假       | `score >= 60`                                       |
| 逻辑表达式   | `AND OR NOT`              | 组合或取反多个判断条件         | `score >= 60 AND age >= 18`                         |
| 范围判断     | `BETWEEN ... AND ...`     | 判断某个值是否位于指定范围内   | `score BETWEEN 60 AND 90`                           |
| 集合判断     | `IN (...)`                | 判断某个值是否属于指定的一组值 | `class_id IN (1, 2, 3)`                             |
| 空值判断     | `IS NULL` / `IS NOT NULL` | 判断字段是否为 `NULL`          | `email IS NULL`                                     |
| 模糊匹配     | `LIKE`                    | 按指定模式匹配字符串           | `name LIKE '张%'`                                   |
| 条件表达式   | `IF()`                    | 根据条件返回两个值中的一个     | `IF(score >= 60, 'pass', 'fail')`                   |
| 条件表达式   | `CASE`                    | 根据多个条件返回不同的值       | `CASE WHEN score >= 60 THEN 'pass' ELSE 'fail' END` |
| 字符串函数   | `CONCAT()`                | 将多个字符串拼接成一个字符串   | `CONCAT(first_name, last_name)`                     |
| 字符串函数   | `UPPER()`                 | 将字符串中的字母转换为大写     | `UPPER(name)`                                       |
| 字符串函数   | `LOWER()`                 | 将字符串中的字母转换为小写     | `LOWER(name)`                                       |
| 字符串函数   | `LENGTH()`                | 获取字符串占用的字节数         | `LENGTH(name)`                                      |
| 日期时间函数 | `NOW()`                   | 获取当前日期和时间             | `updated_at = NOW()`                                |
| 聚合函数     | `COUNT()`                 | 统计记录数量                   | `COUNT(*)`                                          |
| 聚合函数     | `SUM()`                   | 计算一组数值的总和             | `SUM(score)`                                        |
| 聚合函数     | `AVG()`                   | 计算一组数值的平均值           | `AVG(score)`                                        |
| 聚合函数     | `MAX()`                   | 获取一组数据中的最大值         | `MAX(score)`                                        |
| 聚合函数     | `MIN()`                   | 获取一组数据中的最小值         | `MIN(score)`                                        |

## 常用的条件表达式

| 条件表达式                     | 示例                           | 说明                                         |
| ------------------------------ | ------------------------------ | -------------------------------------------- |
| `=` 等于                       | `score = 80`                   | 字符串通常用单引号括起来                     |
| `>` 大于                       | `score > 80`                   | 字符串比较规则由字符集和排序规则决定         |
| `>=` 大于等于                  | `score >= 80`                  |                                              |
| `<` 小于                       | `score < 80`                   |                                              |
| `<=` 小于等于                  | `score <= 80`                  |                                              |
| `<>` 不等于                    | `score <> 80`                  | SQL 标准写法；MySQL 也支持 `!=`              |
| `LIKE` 模糊匹配                | `name LIKE 'ab%'`              | `%` 表示任意长度字符串，`_` 表示任意一个字符 |
| `BETWEEN ... AND ...` 范围查询 | `score BETWEEN 60 AND 90`      | 包含两端                                     |
| `IN` 多值匹配                  | `class_id IN (1, 2, 3)`        | 匹配给定值中的任意一个                       |
| `IS NULL` 判断空值             | `email IS NULL`                | `NULL` 不能用 `= NULL` 判断                  |
| `IS NOT NULL` 判断非空         | `email IS NOT NULL`            | 判断字段不为 `NULL`                          |
| `AND` 且                       | `score >= 60 AND score <= 90`  | 两个条件都满足                               |
| `OR` 或                        | `class_id = 1 OR class_id = 2` | 任意一个条件满足即可                         |
| `NOT` 取反                     | `NOT class_id = 2`             | 对条件结果取反                               |

























参考文章:

- [廖雪峰SQL教程](https://liaoxuefeng.com/books/sql/introduction/index.html)

- [MySQL-doc](https://dev.mysql.com/doc/refman/8.4/en/tutorial.html)
