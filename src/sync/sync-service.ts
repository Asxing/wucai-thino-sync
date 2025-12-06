/**
 * WuCai to Thino Sync Tool - Sync Service
 * 主同步服务：协调各模块，执行同步操作
 */

import { App, TFile } from 'obsidian';
import { WuCaiParser, findWuCaiFiles } from '../parsers/daily-note-parser';
import { ThinoConverter, batchConvertEntries, validateThinoContent } from './thino-converter';
import { ThinoFile, SyncResult } from '../types';
import { WucaiThinoSyncSettings } from '../settings';

/**
 * WuCai 到 Thino 同步服务
 */
export class WucaiThinoSyncService {
    private app: App;
    private settings: WucaiThinoSyncSettings;
    private parser: WuCaiParser;
    private converter: ThinoConverter;
    private saveSettings: () => Promise<void>;

    constructor(app: App, settings: WucaiThinoSyncSettings, saveSettings: () => Promise<void>) {
        this.app = app;
        this.settings = settings;
        this.parser = new WuCaiParser(app);
        this.converter = new ThinoConverter();
        this.saveSettings = saveSettings;
    }

    /**
     * 更新设置引用
     */
    updateSettings(settings: WucaiThinoSyncSettings): void {
        this.settings = settings;
    }

    /**
     * 执行完整同步
     */
    async syncAll(): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            processedEntries: 0,
            createdFiles: 0,
            failedEntries: 0,
            skippedEntries: 0,
            errorMessage: '',
            createdThinoFiles: [],
        };

        try {
            // 检查同步是否启用
            if (!this.settings.enableSync) {
                result.errorMessage = 'Sync is disabled';
                result.success = false;
                return result;
            }

            // 检查文件夹配置
            if (!this.settings.wucaiFolder || !this.settings.thinoFolder) {
                result.errorMessage = 'WuCai or Thino folder not configured';
                result.success = false;
                return result;
            }

            // 确保 Thino 目录存在
            await this.ensureFolder(this.settings.thinoFolder);

            // 查找所有 WuCai 文件（根据 scanDays 过滤）
            const wucaiFiles = await findWuCaiFiles(this.app, this.settings.wucaiFolder, this.settings.scanDays);
            if (wucaiFiles.length === 0) {
                console.debug('[Sync Service] No WuCai files found');
                return result;
            }

            console.debug(`[Sync Service] Found ${wucaiFiles.length} WuCai files (scanDays: ${this.settings.scanDays})`);

            // 处理每个文件
            for (const file of wucaiFiles) {
                const fileResult = await this.syncSingleFile(file);
                result.processedEntries += fileResult.processedEntries;
                result.createdFiles += fileResult.createdFiles;
                result.failedEntries += fileResult.failedEntries;
                result.skippedEntries += fileResult.skippedEntries;
                result.createdThinoFiles.push(...fileResult.createdThinoFiles);
                
                if (!fileResult.success && fileResult.errorMessage) {
                    result.errorMessage += fileResult.errorMessage + '; ';
                }
            }

            // 更新同步游标
            await this.updateSyncCursor(result);

            return result;

        } catch (e) {
            console.error('[Sync Service] Sync failed:', e);
            result.success = false;
            result.errorMessage = `Sync failed: ${e}`;
            return result;
        }
    }

    /**
     * 同步单个文件
     */
    async syncSingleFile(file: TFile): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            processedEntries: 0,
            createdFiles: 0,
            failedEntries: 0,
            skippedEntries: 0,
            errorMessage: '',
            createdThinoFiles: [],
        };

        try {
            console.debug(`[Sync Service] Processing file: ${file.path}`);

            // 解析 WuCai 文件
            const entries = await this.parser.parseFile(file);
            if (entries.length === 0) {
                console.debug(`[Sync Service] No entries found in: ${file.path}`);
                return result;
            }

            console.debug(`[Sync Service] Parsed ${entries.length} entries from ${file.path}`);

            // 转换为 Thino 格式
            const { successful, failed } = batchConvertEntries(entries);

            // 记录转换失败的条目
            result.failedEntries = failed.length;

            if (successful.length === 0) {
                console.debug('[Sync Service] No entries successfully converted');
                return result;
            }

            // 验证转换结果
            const validFiles: ThinoFile[] = [];
            for (const thinoFile of successful) {
                if (validateThinoContent(thinoFile)) {
                    validFiles.push(thinoFile);
                } else {
                    console.warn(`[Sync Service] Thino file format validation failed: ${thinoFile.filename}`);
                    result.failedEntries++;
                }
            }

            // 写入 Thino 文件
            for (const thinoFile of validFiles) {
                const writeResult = await this.writeThinoFile(thinoFile, file.path);
                if (writeResult === 'created') {
                    result.createdFiles++;
                    result.createdThinoFiles.push(thinoFile);
                } else if (writeResult === 'skipped') {
                    result.skippedEntries++;
                } else {
                    result.failedEntries++;
                }
                result.processedEntries++;
            }

            return result;

        } catch (e) {
            console.error(`[Sync Service] Failed to sync file ${file.path}:`, e);
            result.success = false;
            result.errorMessage = `Failed to process ${file.path}: ${e}`;
            return result;
        }
    }

    /**
     * 写入单个 Thino 文件
     * @returns 'created' | 'skipped' | 'failed'
     */
    private async writeThinoFile(thinoFile: ThinoFile, sourceFile: string): Promise<'created' | 'skipped' | 'failed'> {
        try {
            const thinoPath = `${this.settings.thinoFolder}/${thinoFile.filename}`;
            const contentHash = this.converter.getContentHash(thinoFile.content);

            // 检查是否已处理过（使用内容哈希去重）
            const entryKey = `${thinoFile.sourceTimestamp.toISOString()}_${contentHash}`;
            const existingEntry = this.settings.processedEntries[entryKey];

            if (existingEntry) {
                // 检查 Thino 文件是否存在
                const existingFile = this.app.vault.getAbstractFileByPath(existingEntry.thinoFilename);
                if (existingFile) {
                    console.debug(`[Sync Service] Entry already processed and file exists: ${existingEntry.thinoFilename}`);
                    return 'skipped';
                }
            }

            // 检查目标文件是否已存在（跳过策略）
            const existingThinoFile = this.app.vault.getAbstractFileByPath(thinoPath);
            if (existingThinoFile && existingThinoFile instanceof TFile) {
                // 文件已存在，跳过
                console.debug(`[Sync Service] File already exists, skipping: ${thinoPath}`);
                return 'skipped';
            }

            // 创建新文件
            const fullContent = this.converter.generateFullContent(thinoFile);
            await this.app.vault.create(thinoPath, fullContent);
            console.debug(`[Sync Service] Created new file: ${thinoPath}`);

            // 记录已处理条目
            this.settings.processedEntries[entryKey] = {
                contentHash,
                thinoFilename: thinoPath,
                processedAt: new Date().toISOString(),
            };

            return 'created';

        } catch (e) {
            console.error(`[Sync Service] Failed to write Thino file ${thinoFile.filename}:`, e);
            return 'failed';
        }
    }

    /**
     * 确保文件夹存在
     */
    private async ensureFolder(folderPath: string): Promise<void> {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
            await this.app.vault.createFolder(folderPath);
            console.debug(`[Sync Service] Created folder: ${folderPath}`);
        }
    }

    /**
     * 更新同步游标
     */
    private async updateSyncCursor(result: SyncResult): Promise<void> {
        const cursor = this.settings.syncCursor;
        cursor.totalEntriesProcessed += result.createdFiles;
        cursor.failedEntries += result.failedEntries;
        cursor.skippedEntries += result.skippedEntries;
        cursor.lastSyncTime = new Date().toISOString();

        if (result.createdThinoFiles.length > 0) {
            const lastFile = result.createdThinoFiles[result.createdThinoFiles.length - 1];
            cursor.lastProcessedTimestamp = lastFile.sourceTimestamp.toISOString();
        }

        await this.saveSettings();
    }

    /**
     * 重置同步状态
     */
    async resetSyncState(): Promise<void> {
        this.settings.processedEntries = {};
        this.settings.syncCursor = {
            lastProcessedFile: '',
            lastProcessedTimestamp: null,
            totalEntriesProcessed: 0,
            lastSyncTime: null,
            failedEntries: 0,
            skippedEntries: 0,
        };
        await this.saveSettings();
        console.debug('[Sync Service] Sync state reset');
    }

    /**
     * 获取同步状态摘要
     */
    getSyncStatus(): {
        totalProcessed: number;
        lastSyncTime: string | null;
        failedEntries: number;
        skippedEntries: number;
    } {
        const cursor = this.settings.syncCursor;
        return {
            totalProcessed: cursor.totalEntriesProcessed,
            lastSyncTime: cursor.lastSyncTime,
            failedEntries: cursor.failedEntries,
            skippedEntries: cursor.skippedEntries,
        };
    }
}
