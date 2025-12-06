/**
 * WuCai to Thino Sync Tool - Thino Converter
 * Thino 格式转换器：将 WuCai 条目转换为 Thino 文件格式，生成确定性 ID
 */

import { ThinoFile, ThinoFrontmatter, CONFIG } from '../types';
import type { WuCaiEntry } from '../types';

/**
 * Thino 格式转换器
 */
export class ThinoConverter {

    /**
     * 将 WuCai 条目转换为 Thino 文件
     */
    convertEntry(entry: WuCaiEntry): ThinoFile {
        if (this.isEntryEmpty(entry)) {
            throw new Error('Cannot convert empty entry');
        }

        // 获取内容文本
        const content = entry.contentLines.join('\n');

        // 生成确定性 ID
        const thinoId = this.generateDeterministicId(entry.timestamp, content);

        // 生成文件名
        const dateStr = this.formatDate(entry.timestamp, CONFIG.THINO_DATE_FORMAT);
        const filename = CONFIG.THINO_FILENAME_FORMAT
            .replace('{date}', dateStr)
            .replace('{id}', thinoId);

        // 构建 frontmatter
        const frontmatter = this.buildFrontmatter(thinoId, entry.timestamp);

        return {
            filename,
            thinoId,
            frontmatter,
            content,
            sourceTimestamp: entry.timestamp,
            sourceEntry: entry,
        };
    }

    /**
     * 生成确定性 16 位 hex ID
     * 
     * 算法：
     * 1. 时间戳标准化（秒级归零确保同分钟内容合并）
     * 2. 内容标准化（去除多余空白，统一换行符）
     * 3. SHA-256 哈希：时间戳字符串 + 标准化内容
     * 4. 截取前 16 位
     */
    private async generateDeterministicIdAsync(timestamp: Date, content: string): Promise<string> {
        // 时间戳标准化（秒级归零确保同分钟内容合并）
        const normalizedTime = new Date(timestamp);
        normalizedTime.setSeconds(0, 0);
        const timeStr = this.formatDateTime(normalizedTime, 'YYYY-MM-DD HH:mm:00');

        // 内容标准化
        const normalizedContent = this.normalizeContent(content);

        // 生成确定性哈希
        const hashInput = `${timeStr}|${normalizedContent}`;
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return hashHex.substring(0, CONFIG.ID_LENGTH);
    }

    /**
     * 同步版本的确定性 ID 生成（使用简单哈希）
     */
    private generateDeterministicId(timestamp: Date, content: string): string {
        // 时间戳标准化
        const normalizedTime = new Date(timestamp);
        normalizedTime.setSeconds(0, 0);
        const timeStr = this.formatDateTime(normalizedTime, 'YYYY-MM-DD HH:mm:00');

        // 内容标准化
        const normalizedContent = this.normalizeContent(content);

        // 使用简单的字符串哈希
        const hashInput = `${timeStr}|${normalizedContent}`;
        const hash = this.simpleHash(hashInput);
        
        return hash.substring(0, CONFIG.ID_LENGTH);
    }

    /**
     * 简单的字符串哈希函数（生成 hex 字符串）
     */
    private simpleHash(str: string): string {
        let hash1 = 0x811c9dc5;
        let hash2 = 0x01000193;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash1 ^= char;
            hash1 = Math.imul(hash1, 0x01000193);
            hash2 ^= char;
            hash2 = Math.imul(hash2, 0x811c9dc5);
        }

        // 组合两个哈希值生成更长的结果
        const hex1 = (hash1 >>> 0).toString(16).padStart(8, '0');
        const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
        
        return hex1 + hex2;
    }

    /**
     * 标准化内容文本
     */
    private normalizeContent(content: string): string {
        // 统一换行符
        const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // 去除行首尾多余空白，但保留内容结构
        const lines = normalized.split('\n');
        const cleanedLines = lines.map(line => line.trim()).filter(line => line.length > 0);

        // 重新组合，使用单个换行符
        return cleanedLines.join('\n');
    }

    /**
     * 构建 Thino 文件的 YAML frontmatter
     */
    private buildFrontmatter(thinoId: string, timestamp: Date): ThinoFrontmatter {
        const datetimeStr = this.formatDateTime(timestamp, CONFIG.THINO_DATETIME_FORMAT);

        return {
            id: thinoId,
            createdAt: datetimeStr,
            updatedAt: datetimeStr,
            thinoType: CONFIG.THINO_TYPE,
            tags: ['wucai'],
        };
    }

    /**
     * 获取内容的 hash 值（用于验证和去重）
     */
    getContentHash(content: string): string {
        const normalizedContent = this.normalizeContent(content);
        return this.simpleHash(normalizedContent).substring(0, 8);
    }

    /**
     * 格式化日期
     */
    private formatDate(date: Date, format: string): string {
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    }

    /**
     * 格式化日期时间
     */
    private formatDateTime(date: Date, format: string): string {
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const second = date.getSeconds().toString().padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hour)
            .replace('mm', minute)
            .replace('ss', second);
    }

    /**
     * 检查条目是否为空
     */
    private isEntryEmpty(entry: WuCaiEntry): boolean {
        return entry.contentLines.length === 0 ||
               entry.contentLines.every(line => !line.trim());
    }

    /**
     * 生成完整的 Thino 文件内容（包含 YAML frontmatter）
     */
    generateFullContent(thinoFile: ThinoFile): string {
        const { frontmatter, content } = thinoFile;
        
        // 格式化 tags 数组
        const tagsStr = frontmatter.tags.length > 0 
            ? `[${frontmatter.tags.join(', ')}]` 
            : '[]';
        
        const yamlLines = [
            '---',
            `id: ${frontmatter.id}`,
            `createdAt: ${frontmatter.createdAt}`,
            `updatedAt: ${frontmatter.updatedAt}`,
            `thinoType: ${frontmatter.thinoType}`,
            `tags: ${tagsStr}`,
            '---',
            '',
        ];

        return yamlLines.join('\n') + content;
    }
}

/**
 * 便捷函数：转换单个 WuCai 条目
 */
export function convertWuCaiEntry(entry: WuCaiEntry): ThinoFile {
    const converter = new ThinoConverter();
    return converter.convertEntry(entry);
}

/**
 * 批量转换 WuCai 条目
 */
export function batchConvertEntries(entries: WuCaiEntry[]): {
    successful: ThinoFile[];
    failed: Array<{ entry: WuCaiEntry; error: string }>;
} {
    const converter = new ThinoConverter();
    const successful: ThinoFile[] = [];
    const failed: Array<{ entry: WuCaiEntry; error: string }> = [];

    for (const entry of entries) {
        try {
            if (entry.contentLines.length === 0 || entry.contentLines.every(line => !line.trim())) {
                console.debug(`[Thino Converter] Skipping empty entry: ${entry.timestamp.toISOString()}`);
                continue;
            }

            const thinoFile = converter.convertEntry(entry);
            successful.push(thinoFile);
        } catch (e) {
            const errorMsg = `Conversion failed: ${e}`;
            console.warn(`[Thino Converter] Entry conversion failed ${entry.timestamp.toISOString()}: ${errorMsg}`);
            failed.push({ entry, error: errorMsg });
        }
    }

    console.debug(`[Thino Converter] Batch conversion complete: ${successful.length} successful, ${failed.length} failed`);
    return { successful, failed };
}

/**
 * 验证生成的 Thino 文件内容格式
 */
export function validateThinoContent(thinoFile: ThinoFile): boolean {
    try {
        // 检查基本字段
        if (!thinoFile.thinoId || thinoFile.thinoId.length !== CONFIG.ID_LENGTH) {
            return false;
        }

        if (!thinoFile.filename || !thinoFile.filename.endsWith('.md')) {
            return false;
        }

        // 检查 frontmatter 必需字段
        const requiredFields: (keyof ThinoFrontmatter)[] = ['id', 'createdAt', 'updatedAt', 'thinoType'];
        for (const field of requiredFields) {
            if (!(field in thinoFile.frontmatter)) {
                return false;
            }
        }

        // 检查内容不为空
        if (!thinoFile.content.trim()) {
            return false;
        }

        return true;
    } catch (e) {
        console.warn(`[Thino Converter] Thino file format validation failed: ${e}`);
        return false;
    }
}
