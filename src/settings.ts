/**
 * WuCai to Thino Sync Tool - Settings
 * 设置接口和默认值
 */

import { ProcessedEntry, SyncCursor, SyncMode } from './types';

/**
 * 插件设置接口
 */
export interface WucaiThinoSyncSettings {
    /** 是否启用同步功能 */
    enableSync: boolean;

    /** 同步模式：自动或手动 */
    syncMode: SyncMode;

    /** 自动同步间隔（分钟） */
    autoSyncInterval: number;

    /** 扫描天数（只处理最近 N 天的文件，0 表示扫描全部） */
    scanDays: number;

    /** WuCai 笔记存放文件夹路径（相对于 Vault） */
    wucaiFolder: string;

    /** Thino 笔记存放文件夹路径（相对于 Vault） */
    thinoFolder: string;

    /** 是否在启动时同步 */
    syncOnStartup: boolean;

    /** 已处理条目记录（用于去重） */
    processedEntries: Record<string, ProcessedEntry>;

    /** 同步游标 */
    syncCursor: SyncCursor;

    /** 是否启用调试日志 */
    debugMode: boolean;
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: WucaiThinoSyncSettings = {
    enableSync: false,
    syncMode: 'manual',
    autoSyncInterval: 30,
    scanDays: 7,
    wucaiFolder: '',
    thinoFolder: '',
    syncOnStartup: false,
    processedEntries: {},
    syncCursor: {
        lastProcessedFile: '',
        lastProcessedTimestamp: null,
        totalEntriesProcessed: 0,
        lastSyncTime: null,
        failedEntries: 0,
        skippedEntries: 0,
    },
    debugMode: false,
};
