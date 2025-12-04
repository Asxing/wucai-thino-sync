# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Wucai Thino Sync - Obsidian Plugin

## 项目概述 (Project Overview)

**Wucai Thino Sync** 是一个 Obsidian 插件，用于将五彩 (WuCai) Daily Note 中的个人感悟自动同步到 Thino 格式。

### 核心功能 (Core Features)
- 🔄 自动解析 WuCai Daily Note 中的时间戳条目
- 📝 转换为独立的 Thino 笔记文件
- 🏷️ 自动添加 `#wucai` 标签
- ⏰ 支持手动和自动同步模式
- 🔒 智能去重和冲突处理
- 📅 可配置扫描天数限制

### 技术栈 (Tech Stack)
- **TypeScript** - 强类型开发
- **ESBuild** - 快速构建工具
- **Obsidian API** - 插件开发框架
- **Node.js** - 运行环境

## 开发工作流 (Development Workflow)

### 快速启动命令
```bash
# 安装依赖
npm install

# 开发模式 (监听文件变化，自动重新构建)
npm run dev

# 生产构建
npm run build

# 版本管理 (更新 manifest.json 和 versions.json)
npm run version

# 代码检查
eslint main.ts
eslint ./src/
```

### 构建产物说明
- **main.js** - ESBuild 打包的主文件
- **manifest.json** - 插件元信息
- **styles.css** - 样式文件 (当前为空)

### 开发环境配置
- **TypeScript**: 严格模式，目标 ES2020
- **ESBuild**: 开发时监听模式，生产时压缩
- **ESLint**: TypeScript 规则，自动修复

## 架构设计 (Architecture)

### 三层架构模式
```
┌─────────────────────────────────────────┐
│ 现象层 (UI Layer)                        │
│ ├─ main.ts (插件生命周期)                 │
│ ├─ settings-tab.ts (设置界面)             │
│ └─ 用户交互 (命令/按钮)                   │
├─────────────────────────────────────────┤
│ 本质层 (Business Logic Layer)            │
│ ├─ sync-service.ts (同步协调)             │
│ ├─ daily-note-parser.ts (内容解析)       │
│ └─ thino-converter.ts (格式转换)          │
├─────────────────────────────────────────┤
│ 哲学层 (Data Layer)                     │
│ ├─ types.ts (数据模型)                   │
│ ├─ settings.ts (配置管理)                │
│ └─ 文件系统 (Obsidian Vault)             │
└─────────────────────────────────────────┘
```

### 核心模块职责

#### 1. **主控制器** ([main.ts](main.ts))
- **职责**: 插件生命周期管理
- **关键功能**:
  - 插件初始化和销毁
  - 命令注册 (`sync-wucai-to-thino`, `reset-wucai-thino-sync-state`)
  - Ribbon 图标管理
  - 自动同步调度器
  - 启动时同步控制

#### 2. **同步服务** ([src/sync/sync-service.ts](src/sync/sync-service.ts))
- **职责**: 同步操作的核心协调器
- **关键功能**:
  - 文件发现和过滤 (基于 scanDays)
  - 批量处理 WuCai 文件
  - 去重逻辑 (基于内容哈希)
  - 同步状态跟踪和持久化
  - 错误处理和恢复

#### 3. **内容解析器** ([src/parsers/daily-note-parser.ts](src/parsers/daily-note-parser.ts))
- **职责**: WuCai Daily Note 文件解析
- **关键功能**:
  - 识别 `## Daily note` 部分
  - 时间戳模式匹配: `/^- (\d{4}-\d{2}-\d{2} \d{2}:\d{2})$/`
  - 缩进内容提取 (支持 Tab 和 4 空格)
  - 递归文件发现和日期过滤

#### 4. **格式转换器** ([src/sync/thino-converter.ts](src/sync/thino-converter.ts))
- **职责**: WuCai 条目到 Thino 格式转换
- **关键功能**:
  - 确定性 ID 生成 (16位 hex)
  - YAML frontmatter 构建
  - 内容标准化和哈希
  - 批量转换和验证

#### 5. **设置管理** ([src/settings.ts](src/settings.ts) + [src/ui/settings-tab.ts](src/ui/settings-tab.ts))
- **职责**: 配置管理和 UI
- **关键功能**:
  - 同步开关和模式控制
  - 文件夹路径配置
  - 处理记录持久化
  - 同步游标状态管理

## 核心数据模型 (Data Models)

### 关键接口定义

#### WuCaiEntry (WuCai 条目)
```typescript
interface WuCaiEntry {
    timestamp: Date;           // 时间戳
    contentLines: string[];    // 内容行数组
    rawLineNumbers: number[];  // 原始行号 (调试用)
    sourceFile: string;        // 源文件路径
}
```

#### ThinoFile (Thino 文件)
```typescript
interface ThinoFile {
    filename: string;          // 文件名: YYYYMMDD-{16位ID}.md
    thinoId: string;           // 16位 hex ID
    frontmatter: ThinoFrontmatter; // YAML 头部
    content: string;           // 正文内容
    sourceTimestamp: Date;     // 源时间戳
    sourceEntry?: WuCaiEntry;  // 关联的源条目
}
```

#### SyncResult (同步结果)
```typescript
interface SyncResult {
    success: boolean;          // 是否成功
    processedEntries: number;  // 处理条目数
    createdFiles: number;      // 创建文件数
    failedEntries: number;     // 失败条目数
    skippedEntries: number;    // 跳过条目数
    errorMessage: string;      // 错误信息
    createdThinoFiles: ThinoFile[]; // 创建的文件列表
}
```

### 配置常量 (CONFIG)
```typescript
const CONFIG = {
    WUCAI_DAILY_NOTE_SECTION: '## Daily note',
    TIMESTAMP_PATTERN: /^- (\d{4}-\d{2}-\d{2} \d{2}:\d{2})$/,
    CONTENT_INDENT_PATTERNS: ['\t', '    '],
    THINO_FILENAME_FORMAT: '{date}-{id}.md',
    THINO_DATE_FORMAT: 'YYYYMMDD',
    THINO_DATETIME_FORMAT: 'YYYY/MM/DD HH:mm:ss',
    THINO_TYPE: 'JOURNAL',
    ID_LENGTH: 16,
    DEFAULT_AUTO_SYNC_INTERVAL: 30,
} as const;
```

## 重要算法和模式 (Key Algorithms)

### 1. 确定性 ID 生成
```typescript
// 算法: SHA-256(时间戳标准化 + 内容标准化)
// 目标: 同一内容在同一分钟内生成相同 ID
private generateDeterministicId(timestamp: Date, content: string): string {
    // 时间戳标准化 (秒级归零)
    const normalizedTime = new Date(timestamp);
    normalizedTime.setSeconds(0, 0);

    // 内容标准化 (去除多余空白)
    const normalizedContent = this.normalizeContent(content);

    // 生成哈希
    const hashInput = `${timeStr}|${normalizedContent}`;
    return this.simpleHash(hashInput).substring(0, 16);
}
```

### 2. 内容去重策略
```typescript
// 基于内容哈希的去重
const entryKey = `${timestamp.toISOString()}_${contentHash}`;
if (this.settings.processedEntries[entryKey]) {
    return 'skipped'; // 已处理过
}
```

### 3. 增量同步机制
```typescript
// 基于文件修改时间和扫描天数的增量处理
const cutoffDate = scanDays > 0 ? this.getCutoffDate(scanDays) : null;
if (cutoffDate && fileDate < cutoffDate) {
    continue; // 跳过旧文件
}
```

## 插件开发指南 (Plugin Development Guidelines)

### Obsidian 插件生命周期
1. **onload()** - 插件启用时调用
   - 加载设置
   - 注册命令和 UI 元素
   - 启动自动同步 (如果配置)

2. **onunload()** - 插件禁用时调用
   - 清理定时器
   - 保存状态

### 设置持久化模式
```typescript
// 加载设置
this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

// 保存设置
await this.saveData(this.settings);
```

### 命令注册模式
```typescript
this.addCommand({
    id: 'sync-wucai-to-thino',
    name: 'Sync WuCai to Thino',
    callback: async () => await this.manualSync(),
});
```

### 错误处理模式
```typescript
try {
    const result = await this.syncService.syncAll();
    if (result.success) {
        new Notice(`Sync completed: ${result.createdFiles} created`);
    } else {
        new Notice(`Sync failed: ${result.errorMessage}`);
    }
} catch (e) {
    console.error('[Plugin] Error:', e);
    new Notice(`Sync error: ${e}`);
}
```

## 调试和故障排除 (Debugging)

### 调试模式
- 在设置中启用 "Debug mode"
- 查看开发者控制台 (Ctrl+Shift+I)
- 搜索 `[Wucai Thino Sync]` 日志

### 常见问题诊断
1. **文件夹路径错误**
   - 检查 WuCai 和 Thino 文件夹配置
   - 确保路径相对于 Vault 根目录

2. **时间戳格式不匹配**
   - 验证 WuCai 模板配置
   - 检查 `TIMESTAMP_PATTERN` 正则表达式

3. **权限问题**
   - 确保 Thino 目录可写
   - 检查文件创建权限

### 重置同步状态
```typescript
// 清除所有处理记录，重新开始
await this.syncService.resetSyncState();
```

## 性能优化建议 (Performance Guidelines)

### 大量文件处理
- 使用 `scanDays` 限制处理范围
- 批量操作减少 I/O 次数
- 异步处理避免 UI 阻塞

### 内存使用优化
- 流式处理大文件
- 及时释放不需要的数据
- 控制并发处理数量

### 用户体验优化
- 进度通知和状态反馈
- 错误信息清晰可理解
- 操作可撤销或重试

## 测试策略 (Testing Strategy)

### 单元测试重点
- 时间戳解析准确性
- 内容标准化逻辑
- ID 生成确定性

### 集成测试场景
- 完整同步流程
- 错误处理和恢复
- 设置变更影响

### 手动测试检查清单
- [ ] 不同格式的 WuCai 文件
- [ ] 边界情况 (空内容、特殊字符)
- [ ] 大量文件性能测试
- [ ] 设置界面交互

## 文件结构说明 (File Structure)

```
wucai-thino-sync/
├── main.ts                    # 插件入口点
├── manifest.json             # 插件元信息
├── package.json              # 依赖和脚本
├── tsconfig.json             # TypeScript 配置
├── esbuild.config.mjs        # 构建配置
├── .eslintrc                 # ESLint 配置
├── styles.css                # 插件样式
└── src/
    ├── types.ts              # 数据模型和常量
    ├── settings.ts           # 设置接口和默认值
    ├── parsers/
    │   └── daily-note-parser.ts  # WuCai 文件解析
    ├── sync/
    │   ├── sync-service.ts   # 同步服务协调器
    │   └── thino-converter.ts    # 格式转换器
    └── ui/
        └── settings-tab.ts  # 设置界面
```

## 关键配置文件

### package.json Scripts
- `dev`: 开发模式，文件监听和自动重建
- `build`: 生产构建，类型检查 + 压缩
- `version`: 版本管理，更新 manifest 和 versions

### esbuild.config.mjs
- 入口: `main.ts`
- 输出: `main.js`
- 外部依赖: Obsidian API 和 CodeMirror
- 开发模式: 监听 + 源码映射
- 生产模式: 压缩 + 树摇

### tsconfig.json
- 目标: ES2020
- 模块: ESNext
- 严格模式: 启用
- 源码映射: 内联

## 扩展点和未来改进 (Extension Points)

### 可扩展的解析器
- 支持不同的 WuCai 模板格式
- 自定义时间戳模式
- 多语言内容处理

### 可配置的转换器
- 自定义 Thino 模板
- 标签规则配置
- ID 生成策略选择

### 高级同步功能
- 双向同步支持
- 冲突解决策略
- 增量备份机制