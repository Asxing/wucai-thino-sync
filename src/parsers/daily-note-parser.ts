/**
 * WuCai to Thino Sync Tool - Daily Note Parser
 * WuCai 内容解析器：解析 Daily Note 文件，提取时间戳条目
 */

import { App, TFile, TFolder } from 'obsidian';
import { WuCaiEntry, CONFIG } from '../types';

/**
 * WuCai 解析错误
 */
export class WuCaiParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WuCaiParseError';
    }
}

/**
 * WuCai Daily Note 解析器
 */
export class WuCaiParser {
    private app: App;
    private timestampRegex: RegExp;

    constructor(app: App) {
        this.app = app;
        this.timestampRegex = CONFIG.TIMESTAMP_PATTERN;
    }

    /**
     * 解析 WuCai Daily Note 文件
     * @param file TFile 对象
     * @returns WuCaiEntry 数组
     */
    async parseFile(file: TFile): Promise<WuCaiEntry[]> {
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');

        // 找到 Daily note 部分
        const dailyNoteStart = this.findDailyNoteSection(lines);
        if (dailyNoteStart === -1) {
            console.debug(`[WuCai Parser] File does not contain '${CONFIG.WUCAI_DAILY_NOTE_SECTION}': ${file.path}`);
            return [];
        }

        // 解析时间戳条目
        const entries = this.parseEntries(lines, dailyNoteStart, file.path);
        console.debug(`[WuCai Parser] Parsed ${entries.length} entries from ${file.path}`);

        return entries;
    }

    /**
     * 查找 Daily note 部分的起始行号
     */
    private findDailyNoteSection(lines: string[]): number {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === CONFIG.WUCAI_DAILY_NOTE_SECTION) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 从 Daily note 部分解析时间戳条目
     */
    private parseEntries(lines: string[], startLine: number, sourceFile: string): WuCaiEntry[] {
        const entries: WuCaiEntry[] = [];
        let currentEntry: WuCaiEntry | null = null;

        // 从 Daily note 部分开始解析
        for (let i = startLine + 1; i < lines.length; i++) {
            const line = lines[i];
            const lineContent = line.trimEnd();

            // 检测时间戳行
            const timestampMatch = lineContent.trim().match(this.timestampRegex);
            if (timestampMatch) {
                // 保存前一个条目
                if (currentEntry && !this.isEntryEmpty(currentEntry)) {
                    entries.push(currentEntry);
                }

                // 开始新条目
                try {
                    const timestampStr = timestampMatch[1];
                    const timestamp = this.parseTimestamp(timestampStr);
                    currentEntry = {
                        timestamp,
                        contentLines: [],
                        rawLineNumbers: [i],
                        sourceFile,
                    };
                    console.debug(`[WuCai Parser] Found timestamp: ${timestampStr} at line ${i + 1}`);
                } catch (e) {
                    console.warn(`[WuCai Parser] Invalid timestamp format '${timestampMatch[1]}' at line ${i + 1}: ${e}`);
                    currentEntry = null;
                }
            } else if (currentEntry && this.isContentLine(lineContent)) {
                // 收集缩进内容行
                const content = this.extractContent(lineContent);
                if (content.trim()) { // 忽略空内容行
                    currentEntry.contentLines.push(content);
                    currentEntry.rawLineNumbers.push(i);
                    console.debug(`[WuCai Parser] Added content line ${i + 1}: ${content.substring(0, 50)}...`);
                }
            } else if (currentEntry && lineContent.trim() === '') {
                // 空行，继续收集（可能是内容中的换行）
                continue;
            } else if (lineContent.trim().startsWith('##')) {
                // 遇到新的标题，停止解析当前部分
                break;
            }
        }

        // 保存最后一个条目
        if (currentEntry && !this.isEntryEmpty(currentEntry)) {
            entries.push(currentEntry);
        }

        return entries;
    }

    /**
     * 判断是否为内容行（缩进行）
     */
    private isContentLine(line: string): boolean {
        for (const indentPattern of CONFIG.CONTENT_INDENT_PATTERNS) {
            if (line.startsWith(indentPattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 提取行的实际内容（去除缩进）
     */
    private extractContent(line: string): string {
        for (const indentPattern of CONFIG.CONTENT_INDENT_PATTERNS) {
            if (line.startsWith(indentPattern)) {
                return line.substring(indentPattern.length);
            }
        }
        return line;
    }

    /**
     * 解析时间戳字符串为 Date 对象
     */
    private parseTimestamp(timestampStr: string): Date {
        // 格式：YYYY-MM-DD HH:mm
        const [datePart, timePart] = timestampStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute);
    }

    /**
     * 检查条目是否为空
     */
    private isEntryEmpty(entry: WuCaiEntry): boolean {
        return entry.contentLines.length === 0 ||
               entry.contentLines.every(line => !line.trim());
    }

    /**
     * 验证文件是否为有效的 WuCai Daily Note
     */
    async validateFile(file: TFile): Promise<boolean> {
        if (!file.name.startsWith('Daily Note')) {
            return false;
        }

        try {
            const content = await this.app.vault.read(file);
            return content.includes(CONFIG.WUCAI_DAILY_NOTE_SECTION);
        } catch {
            return false;
        }
    }

    /**
     * 在指定文件夹下查找所有 WuCai Daily Note 文件
     * @param folderPath 文件夹路径
     * @param scanDays 扫描天数（0 表示扫描全部）
     */
    async findWuCaiFiles(folderPath: string, scanDays = 0): Promise<TFile[]> {
        const files: TFile[] = [];
        const folder = this.app.vault.getAbstractFileByPath(folderPath);

        if (!folder || !(folder instanceof TFolder)) {
            console.warn(`[WuCai Parser] Folder not found: ${folderPath}`);
            return files;
        }

        // 计算截止日期
        const cutoffDate = scanDays > 0 ? this.getCutoffDate(scanDays) : null;

        // 递归查找所有 Daily Note 文件
        await this.findFilesRecursive(folder, files, cutoffDate);

        return files.sort((a, b) => a.path.localeCompare(b.path));
    }

    /**
     * 获取截止日期
     */
    private getCutoffDate(days: number): Date {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - days);
        return date;
    }

    /**
     * 从文件名解析日期
     * 文件名格式: Daily Note YYYY-MM-DD-YYYYMMDD.md
     */
    private parseDateFromFilename(filename: string): Date | null {
        // 匹配 Daily Note YYYY-MM-DD 格式
        const match = filename.match(/Daily Note (\d{4})-(\d{2})-(\d{2})/);
        if (!match) {
            return null;
        }
        const [, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    /**
     * 递归查找文件
     * @param folder 文件夹
     * @param files 文件列表
     * @param cutoffDate 截止日期（可选）
     */
    private async findFilesRecursive(folder: TFolder, files: TFile[], cutoffDate: Date | null): Promise<void> {
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                if (await this.validateFile(child)) {
                    // 如果有截止日期，检查文件日期
                    if (cutoffDate) {
                        const fileDate = this.parseDateFromFilename(child.name);
                        if (fileDate && fileDate < cutoffDate) {
                            console.debug(`[WuCai Parser] Skipping old file: ${child.name} (before ${cutoffDate.toISOString().split('T')[0]})`);
                            continue;
                        }
                    }
                    files.push(child);
                }
            } else if (child instanceof TFolder) {
                await this.findFilesRecursive(child, files, cutoffDate);
            }
        }
    }
}

/**
 * 便捷函数：解析单个 WuCai 文件
 */
export async function parseWuCaiFile(app: App, file: TFile): Promise<WuCaiEntry[]> {
    const parser = new WuCaiParser(app);
    return parser.parseFile(file);
}

/**
 * 便捷函数：查找 WuCai 文件
 * @param app Obsidian App
 * @param folderPath 文件夹路径
 * @param scanDays 扫描天数（0 表示扫描全部）
 */
export async function findWuCaiFiles(app: App, folderPath: string, scanDays = 0): Promise<TFile[]> {
    const parser = new WuCaiParser(app);
    return parser.findWuCaiFiles(folderPath, scanDays);
}
