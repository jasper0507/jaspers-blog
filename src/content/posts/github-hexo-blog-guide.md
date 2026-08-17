---
title: "零基础利用Github、Hexo搭建个人博客(超详细版)"
description: "这是一篇面向零基础小白利用Github、Hexo搭建属于自己的个人博客的详细教学。读完本篇你将获得：1、属于自己的博客网站。2、熟悉git的基本操作3、更加了解github"
publishedAt: "2026-01-23T15:45:34+08:00"
tags:
  - "工程实践"
  - "站点与博客"
  - "教程"
  - "Hexo"
  - "GitHub"
  - "Git"
draft: false
---
## 一、需求描述
希望搭建一个属于自己的**个人博客平台**，用于分享 Markdown 格式的技术教程、学习笔记，同时支持自身在线查阅；但受限于零服务器资源、零建站经验，不想投入成本购买服务器，也不愿花费大量时间研究复杂的建站技术；需要一份从环境配置、主题定制，到内容发布、部署上线的超详细分步指南，确保按步骤操作就能完成博客搭建。
免费托管需求可通过 **GitHub** 平台实现，Markdown 内容快速生成静态博客的需求可通过 **Hexo** 框架满足，两者结合即可打造一套零成本、易维护的个人博客系统。
## 二、准备工作
### 2.1 安装Git
参考[超详细Git安装指南](https://blog.csdn.net/qq_62223405/article/details/154869827?ops_request_misc=elastic_search_misc&request_id=65cb24b096bb603b07cb714b5f6366dd&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~top_click~default-2-154869827-null-null.142^v102^pc_search_result_base3&utm_term=git%E5%AE%89%E8%A3%85%E6%95%99%E7%A8%8B&spm=1018.2226.3001.4187)一步一步跟着做即可。
> 附赠Git快速上手教程
> - [Git新手入门参考](https://blog.csdn.net/2402_82377921/article/details/157185620?spm=1011.2124.3001.6209)
> - [Git教程-廖雪峰的官方网站](https://liaoxuefeng.com/books/git/create-repo/index.html)(强推)
> - [B站狂神说](https://www.bilibili.com/video/BV1FE411P7B3/?spm_id_from=333.337.search-card.all.click)
> 建议：主看[Git教程-廖雪峰的官方网站](https://liaoxuefeng.com/books/git/create-repo/index.html)，遇到不理解的地方参考[B站狂神说](https://www.bilibili.com/video/BV1FE411P7B3/?spm_id_from=333.337.search-card.all.click)，想快速上手看[Git新手入门参考](https://blog.csdn.net/2402_82377921/article/details/157185620?spm=1011.2124.3001.6209)。
### 2.2 安装Node.js
参考[超详细Node.js安装指南](https://blog.csdn.net/m0_73467482/article/details/157034968)一步一步跟着做即可。
### 2.3 安装Hexo
#### 2.3.1 安装npm
按正常步骤已经安装完毕，如不放心可执行以下命令查看：
```bash
输入命令node -v  # 若输出v20.x.x，说明Node.js安装成功。

输入命令npm -v   # 若输出对应版本号，说明npm包管理工具同步安装成功。
```
#### 2.3.2 安装Hexo
```bash
#1-使用npm下载安装Hexo
npm install hexo-cli -g
 
#2-查看hexo版本信息(显示对应的版本信息则表示安装成功)
hexo -v
```
### 2.4 创建Hexo项目
```bash
#1-进入指定路径(博客内容放置的目录下)
cd D:\MyBlog
 
#2-创建一个Hexo新项目
hexo init ckblogs
 
#3-进入该内容目录中
cd ckblogs
 
#4-安装Hexo项目核心依赖内容（必须步骤，保证项目正常运行）
npm install
 
#5-安装Hexo部署到GitHub专用依赖包（后续部署必须，提前安装）
npm install hexo-deployer-git --save
 
#6-启动Hexo项目（按下【Ctrl+C】停止服务）
hexo server

# 备选：如果4000端口被占用，可指定其他端口启动，例如4001端口
# hexo server -p 4001

#7-在浏览器输入【localhost:4000】访问到项目页面（表示项目安装配置完成）
http://localhost:4000/
```
## 三、主题配置
### 3.1安装主题
到[Hexo主题官网](https://hexo.io/themes/)(或在Github上搜索)挑选自己喜欢的主题(下面我将以ICARUS主题为例，其他主题同理)
> 这里推荐一些简约主题：NEXT、Fluid、Aurora

在Hexo主题官网挑选喜欢的主题后，可点击**'Visit preview site'**体验主题。一般原作者会在此处写下安装及配置教程
![主题示例](/images/posts/github-hexo-blog-guide/theme-configuration-example.jpg)
> 寻找主题配置教程示例

![主题安装示例](/images/posts/github-hexo-blog-guide/theme-installation-example.jpg)
> 寻找主题安装教程示例

按照主题内置教程安装好后，执行以下命令：
```bash
#1-进入创建好的blog项目中
cd D:\MyBlog\ckblogs

#2-安装blog项目所需的依赖内容(如已安装请忽略)
npm install
 
#3-清除缓存
hexo clean
 
#4-编译
hexo g
 
#5-启动服务
hexo s
```
> 注意：所有的命令操作都是在Hexo根目录下进行的

安装好主题后，一般情况下可以在"D:\MyBlog\ckblogs\themes"目录下找到，但是有些特殊的主题会安装到"D:\MyBlog\ckblogs\node_modules"目录下(如ICARUS)。此时可以在本地预览效果。
### 3.2 主题个性化配置
可在_config.yml文件(**在主题目录下，不是Hexo根目录下的文件！**)中自行编辑配置。
> 有些特殊主题下该文件的名字可以不同，不过大同小异。可根据主题提供的教程文档进行配置

配置_config.yml时的一些坑：
- 版本号一般不用改
- 换logo及头像的图片时要注意路径问题及图片格式、尺寸
- 有些导航栏的页面需要你自己填写。(如About导航栏，你可以这么配置：About: [你的Github主页链接或其他链接])
- 一些插件最好用国内的，以免网速慢或日后出问题麻烦
- 有不懂的地方一定要参考教程文档或问AI，不要自己乱改，出bug很麻烦。
- 配置好主题后先到本地预览效果。可以在网页中打开开发者工具（快捷键：`ctrl+shift+i`）查看是否有报错，**有些报错可能是浏览器自身扩展引发的**，可以忽略。


推荐好用的图床网站[点击跳转](https://imgchr.com/)，不要上传二维码等隐私图片（bz曾上传了微信二维码，过一段时间链接自动失效了），不要上传违法图片。
也可以使用github或gitee等仓库托管图片，不过要**注意防盗链的问题**！
> 以上都是bz血与泪的教训[哭]
### 3.3 启用主题
俩种方式：
一 手动修改
打开Hexo根目录下的_config.yml文件并编辑，找到文件中的theme: landscape（Hexo 默认主题），将其修改为theme: [你的主题]
>注意：这里的主题名必须和主题文件夹名称一致，大小写敏感）
## 四、将Hexo项目部署到Github上
### 4.1 将本机配置为免密登录GitHub
这步在[安装Git](#21-安装git)中应该操作完成。没有配置好的可以问下AI或重新看下教程。
验证方法：
```bash
ssh -T git@github.com
# 回车后如果出现 GitHub 用户名相关提示，即表示配置成功
# 首次验证会提示Are you sure you want to continue connecting (yes/no)?，输入yes回车即可
```
### 4.2 将本地生成的SSH公钥内容复制到Github中
按正常步骤也已操作完毕。
#### 操作步骤：
1、 登录你的 GitHub 账号（ID：jasper0507），点击页面右上角的头像图标
2、 在弹出的下拉菜单中，点击进入【Settings】（设置）页面
3、 在左侧菜单栏中，找到并点击【SSH and GPG keys】选项
4、 点击页面右上角的【New SSH key】按钮，进入 SSH 密钥添加界面
5、填写密钥配置项：
【Title】：自定义填写（可填如hexo-blog-deploy等标识性名称，无特殊要求）
【Key type】：选择【Authentication key】（身份验证密钥）
【Key】：打开本地生成的 SSH 密钥对中后缀为.pub的公钥文件，全选文件内的所有内容，粘贴到输入框中
6、点击页面底部的【Add SSH key】按钮，完成公钥的添加操作

### 4.3 在Github上创建所属博客的仓库
#### 操作步骤
1.  登录 GitHub 账号后，点击页面右上角的加号图标【+】
2.  在弹出的下拉菜单中，点击【New repository】选项，进入仓库创建页面
3.  根据自身需求填写**仓库名称**（[你的github用户名].github.io），选择**公开**(私有仓库无法搭建博客)，其他配置可默认
4.  点击页面底部的【Create repository】按钮，完成 GitHub 仓库的创建
5.  仓库创建成功后，在当前仓库界面的右侧区域，找到并点击【code】按钮
6.  在展开的选项中，切换到【local】标签页
7.  选择【ssh】选项，点击右侧的**复制图标**，即可获取该仓库的 SSH 链接

### 4.4 配置文件
打开编辑Hexo根目录下_config.yml文件
添加并编辑以下配置
```bash
deploy:
  type: 'git'
  repo: git@github.com:自己在github上的用户名称/仓库名称.git
  branch: main
  name: 自己在github上的用户名称
  email: 自己在github上的用户对应的邮箱
```
### 4.5 部署项目
```bash
#1-进入本地的blog项目
cd ckblogs

#2-安装部署项目到github所需的包
npm install hexo-deployer-git --save
 
#3--清除缓存
hexo clean
 
#4-编译blog项目
hexo g
 
#5-部署blog项目到github上
hexo d
```
看到"INFO Deploy done: git"就代表部署成功了，可到github仓库中查看(可能有延迟)。
## 五、打开博客网站查看效果
至此，你的个人博客网站已经部署成功了！在浏览器中输入`[你的github用户名].github.io`即可进入你的专属博客。
仍需测试博客的功能等是否一切正常，如果异常可以翻阅教程文档或询问ai后修改主题文件相关代码。
修改后需执行以下命令：
```bash
# 首先在本地预览，测试效果
hexo clean #清理缓存

hexo s     #启动本地服务，可访问`http://localhost:4000/`

# 确认无误后再上传
hexo clean && hexo g -d #一键部署
```
> 注意：修改后可能因为延迟等原因无法立即在网页上看到效果，可以等几分钟或者启动科学上网刷新网页.
## 六、新增博客内容
可参考[如何新增博客内容？](https://blog.jasper0507.cc.cd/posts/hexo-icarus-content-guide/)，有详细教程。
## 七、 结语
本文章结合了bz自己在搭建过程中的经验教训以及好的教学文档。如发现文章有任何错误欢迎留言或评论。谢谢大家！
