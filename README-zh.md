# Wucai Thino Sync

一个 Obsidian 插件，用于将 [五彩 (WuCai)](https://www.dotalk.cn/product/wucai) Daily Note 中的个人感悟自动同步到 [Thino](https://github.com/Quorafind/Obsidian-Thino) 格式，让你的零碎想法通过 Thino 完美展现。

## ✨ 功能特性

- 📝 自动解析 WuCai Daily Note 中 `## Daily note` 部分的时间戳条目
- 🔄 将每条感悟转换为独立的 Thino 笔记文件
- 🏷️ 自动添加 `#wucai` 标签便于筛选
- ⏰ 支持手动同步和自动同步两种模式
- 📅 可配置扫描天数，默认只处理最近 7 天的笔记
- 🔒 智能去重，已同步的条目不会重复处理
- 💾 冲突处理：已存在的 Thino 文件会自动跳过

## 📋 前置要求

本插件需要配合以下两个插件使用：

### 1. 五彩 (WuCai) 插件

需要开启 **日更同步配置**（官方默认配置），模板格式如下：

```jinja2
{% block highlights %}
{% if isdailynote  %}
## Daily note
{{ highlights | style_dailynote }}
{% else %}
## 划线列表
{% for item in highlights %}
{{ item | style1({prefix:"> ", anno:"> __想法__：", color:"█  "}) }}
{% endfor %}
{% endif %}
{% endblock %}
```

WuCai 会生成类似以下格式的 Daily Note 文件：

**文件名格式**: `Daily Note YYYY-MM-DD-YYYYMMDD.md`

**文件内容格式**:
```markdown
## Daily note

- 2025-12-04 10:30
    这是我的一条感悟内容...

- 2025-12-04 14:15
    这是另一条感悟内容...
```

### 2. Thino 插件

需要开启 **Multi 模式**，并指定 Thino 笔记存放的文件夹。

Thino Multi 模式会将每条笔记存储为独立的 Markdown 文件，本插件生成的文件格式如下：

**文件名格式**: `YYYYMMDD-{16位ID}.md`

**文件内容格式**:
```yaml
---
id: a1b2c3d4e5f6g7h8
createdAt: 2025/12/04 10:30:00
updatedAt: 2025/12/04 10:30:00
thinoType: JOURNAL
tags: [wucai]
---

这是我的一条感悟内容...
```

## 🚀 安装方法

### 手动安装

1. 下载最新的 Release（`main.js`, `manifest.json`, `styles.css`）
2. 在 Vault 中创建文件夹：`.obsidian/plugins/wucai-thino-sync/`
3. 将下载的文件复制到该文件夹
4. 重启 Obsidian
5. 在 **Settings → Community plugins** 中启用 `Wucai Thino Sync`

### 从 dist 目录安装

```bash
cp dist/* <你的Vault>/.obsidian/plugins/wucai-thino-sync/
```

## ⚙️ 配置说明

在 **Settings → Wucai Thino Sync** 中进行配置：

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| **Enable sync** | 启用/禁用同步功能 | 关闭 |
| **Sync mode** | 同步模式：Manual(手动) / Automatic(自动) | Manual |
| **Auto sync interval** | 自动同步间隔（分钟） | 30 |
| **Scan days** | 扫描天数，0 表示扫描全部 | 7 |
| **Sync on startup** | Obsidian 启动时自动同步 | 关闭 |
| **WuCai folder** | WuCai Daily Note 存放路径 | 需手动配置 |
| **Thino folder** | Thino 笔记存放路径 | 需手动配置 |
| **Debug mode** | 启用调试日志 | 关闭 |

## 📖 使用方法

### 方式一：手动同步

1. 点击左侧栏的 **同步图标** (🔄)
2. 或使用命令面板 (Ctrl/Cmd + P) 运行 `Sync WuCai to Thino`

### 方式二：自动同步

1. 在设置中将 **Sync mode** 改为 `Automatic`
2. 设置 **Auto sync interval** 为期望的间隔时间
3. 开启 **Enable sync**

### 重置同步状态

如果需要重新处理所有文件，可以在设置中点击 **Reset** 按钮清除同步记录。

## 🔧 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build

# 打包到 dist 目录
mkdir -p dist && cp main.js manifest.json styles.css dist/
```

## 📁 项目结构

```
wucai-thino-sync/
├── main.ts                      # 插件入口
├── src/
│   ├── settings.ts              # 设置接口和默认值
│   ├── types.ts                 # TypeScript 类型定义
│   ├── parsers/
│   │   └── daily-note-parser.ts # WuCai 文件解析器
│   ├── sync/
│   │   ├── sync-service.ts      # 同步服务主逻辑
│   │   └── thino-converter.ts   # Thino 格式转换器
│   └── ui/
│       └── settings-tab.ts      # 设置面板 UI
└── dist/                        # 打包输出目录
```

## 🤝 相关项目

- [五彩 WuCai](https://www.dotalk.cn/product/wucai) - 网页划线与笔记工具
- [Obsidian Thino](https://github.com/Quorafind/Obsidian-Thino) - 灵感捕捉与闪念笔记

## 📄 许可证

MIT License

## 🙏 致谢

感谢五彩和 Thino 插件为 Obsidian 用户带来的优秀体验。
