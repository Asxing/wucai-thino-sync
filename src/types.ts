/**
 * WuCai to Thino Sync Tool - Type Definitions
 * 数据结构定义：WuCai条目、Thino文件、同步游标等核心数据模型
 */

import { TFile } from 'obsidian';

/**
 * WuCai Daily Note 中的单个时间戳条目
 */
export interface WuCaiEntry {
    /** 时间戳（分钟精度） */
    timestamp: Date;
    /** 该时间戳下的所有内容行 */
    contentLines: string[];
    /** 原文件中的行号列表（用于调试） */
    rawLineNumbers: number[];
    /** 源文件路径 */
    sourceFile: string;
}

/**
 * 生成的 Thino 文件数据
 */
export interface ThinoFile {
    /** 文件名（不含路径） */
    filename: string;
    /** 16位hex ID */
    thinoId: string;
    /** YAML frontmatter 数据 */
    frontmatter: ThinoFrontmatter;
    /** 文件内容（不含 frontmatter） */
    content: string;
    /** 源时间戳 */
    sourceTimestamp: Date;
    /** 对应的 WuCai 条目（可选） */
    sourceEntry?: WuCaiEntry;
}

/**
 * Thino 文件的 YAML frontmatter 结构
 */
export interface ThinoFrontmatter {
    id: string;
    createdAt: string;
    updatedAt: string;
    thinoType: string;
    tags: string[];
}

/**
 * 同步进度游标
 */
export interface SyncCursor {
    /** 最后处理的文件路径 */
    lastProcessedFile: string;
    /** 最后处理的时间戳 */
    lastProcessedTimestamp: string | null;
    /** 总处理条目数 */
    totalEntriesProcessed: number;
    /** 最后同步时间 */
    lastSyncTime: string | null;
    /** 失败条目数 */
    failedEntries: number;
    /** 跳过条目数 */
    skippedEntries: number;
}

/**
 * 已处理条目的记录（用于去重）
 */
export interface ProcessedEntry {
    /** 内容哈希（8位hex） */
    contentHash: string;
    /** 生成的 Thino 文件名 */
    thinoFilename: string;
    /** 处理时间 */
    processedAt: string;
}

/**
 * 同步操作结果
 */
export interface SyncResult {
    /** 是否成功 */
    success: boolean;
    /** 处理的条目数 */
    processedEntries: number;
    /** 创建的文件数 */
    createdFiles: number;
    /** 失败的条目数 */
    failedEntries: number;
    /** 跳过的条目数（已存在） */
    skippedEntries: number;
    /** 错误信息（如有） */
    errorMessage: string;
    /** 创建的 Thino 文件列表 */
    createdThinoFiles: ThinoFile[];
}

/**
 * 文件映射记录
 */
export interface MappingRecord {
    /** WuCai 源文件路径 */
    sourceFile: string;
    /** 原始时间戳 */
    sourceTimestamp: string;
    /** 生成的 Thino 文件路径 */
    thinoFile: string;
    /** 生成的16位hex ID */
    thinoId: string;
    /** 内容 hash */
    contentHash: string;
    /** 处理时间 */
    createdAt: string;
    /** 状态：success/failed/skipped */
    status: 'success' | 'failed' | 'skipped';
}

/**
 * 同步模式
 */
export type SyncMode = 'auto' | 'manual';

/**
 * 配置常量
 */
export const CONFIG = {
    /** WuCai Daily Note 部分标题 */
    WUCAI_DAILY_NOTE_SECTION: '## Daily note',
    /** 时间戳正则模式 */
    TIMESTAMP_PATTERN: /^- (\d{4}-\d{2}-\d{2} \d{2}:\d{2})$/,
    /** 内容缩进模式（Tab 或 4个空格） */
    CONTENT_INDENT_PATTERNS: ['\t', '    '],
    /** Thino 文件名格式 */
    THINO_FILENAME_FORMAT: '{date}-{id}.md',
    /** Thino 日期格式 */
    THINO_DATE_FORMAT: 'YYYYMMDD',
    /** Thino 日期时间格式 */
    THINO_DATETIME_FORMAT: 'YYYY/MM/DD HH:mm:ss',
    /** Thino 类型 */
    THINO_TYPE: 'JOURNAL',
    /** ID 长度（16位hex） */
    ID_LENGTH: 16,
    /** 默认自动同步间隔（分钟） */
    DEFAULT_AUTO_SYNC_INTERVAL: 30,
} as const;
