/**
 * WuCai to Thino Sync - Obsidian Plugin
 * 将 WuCai Daily Note 中的个人感悟同步到 Thino 格式
 */

import { App, Notice, Plugin } from 'obsidian';
import { WucaiThinoSyncSettings, DEFAULT_SETTINGS } from './src/settings';
import { WucaiThinoSyncService } from './src/sync/sync-service';
import { WucaiThinoSyncSettingTab } from './src/ui/settings-tab';

export default class WucaiThinoSyncPlugin extends Plugin {
    settings: WucaiThinoSyncSettings;
    syncService: WucaiThinoSyncService;
    private autoSyncIntervalId: number | null = null;

    async onload() {
        console.log('Loading Wucai Thino Sync plugin');

        // 加载设置
        await this.loadSettings();

        // 初始化同步服务
        this.syncService = new WucaiThinoSyncService(
            this.app,
            this.settings,
            () => this.saveSettings()
        );

        // 添加 Ribbon 图标
        this.addRibbonIcon('sync', 'Sync WuCai to Thino', async () => {
            await this.manualSync();
        });

        // 添加命令
        this.addCommand({
            id: 'sync-wucai-to-thino',
            name: 'Sync WuCai to Thino',
            callback: async () => {
                await this.manualSync();
            },
        });

        this.addCommand({
            id: 'reset-wucai-thino-sync-state',
            name: 'Reset sync state',
            callback: async () => {
                await this.syncService.resetSyncState();
                new Notice('Sync state has been reset');
            },
        });

        // 添加设置页面
        this.addSettingTab(new WucaiThinoSyncSettingTab(this.app, this));

        // 启动时同步
        if (this.settings.enableSync && this.settings.syncOnStartup) {
            // 延迟执行以确保 Vault 已完全加载
            this.registerInterval(
                window.setTimeout(async () => {
                    console.log('[Wucai Thino Sync] Running startup sync...');
                    await this.manualSync();
                }, 5000) as unknown as number
            );
        }

        // 启动自动同步
        if (this.settings.enableSync && this.settings.syncMode === 'auto') {
            this.startAutoSync();
        }
    }

    onunload() {
        console.log('Unloading Wucai Thino Sync plugin');
        this.stopAutoSync();
    }

    /**
     * 手动同步
     */
    async manualSync(): Promise<void> {
        if (!this.settings.enableSync) {
            new Notice('Sync is disabled. Enable it in settings.');
            return;
        }

        new Notice('Starting sync...');

        try {
            const result = await this.syncService.syncAll();

            if (result.success) {
                if (result.createdFiles > 0) {
                    new Notice(`Sync completed: ${result.createdFiles} created, ${result.skippedEntries} skipped`);
                } else if (result.skippedEntries > 0) {
                    new Notice(`Sync completed: ${result.skippedEntries} entries already synced`);
                } else {
                    new Notice('Sync completed: No new entries found');
                }
            } else {
                new Notice(`Sync failed: ${result.errorMessage}`);
            }
        } catch (e) {
            console.error('[Wucai Thino Sync] Sync error:', e);
            new Notice(`Sync error: ${e}`);
        }
    }

    /**
     * 启动自动同步
     */
    startAutoSync(): void {
        this.stopAutoSync(); // 先停止现有的

        if (!this.settings.enableSync || this.settings.syncMode !== 'auto') {
            return;
        }

        const intervalMs = this.settings.autoSyncInterval * 60 * 1000;
        console.log(`[Wucai Thino Sync] Starting auto sync with interval: ${this.settings.autoSyncInterval} minutes`);

        this.autoSyncIntervalId = this.registerInterval(
            window.setInterval(async () => {
                console.log('[Wucai Thino Sync] Running auto sync...');
                try {
                    const result = await this.syncService.syncAll();
                    if (result.createdFiles > 0) {
                        new Notice(`Auto sync: ${result.createdFiles} entries synced`);
                    }
                } catch (e) {
                    console.error('[Wucai Thino Sync] Auto sync error:', e);
                }
            }, intervalMs)
        );
    }

    /**
     * 停止自动同步
     */
    stopAutoSync(): void {
        if (this.autoSyncIntervalId !== null) {
            window.clearInterval(this.autoSyncIntervalId);
            this.autoSyncIntervalId = null;
            console.log('[Wucai Thino Sync] Auto sync stopped');
        }
    }

    /**
     * 加载设置
     */
    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    /**
     * 保存设置
     */
    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        // 更新同步服务的设置引用
        if (this.syncService) {
            this.syncService.updateSettings(this.settings);
        }
    }
}
