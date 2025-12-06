/**
 * WuCai to Thino Sync Tool - Settings Tab
 * 设置面板 UI
 */

import { PluginSettingTab, Setting, Notice, TFolder, Modal, App } from 'obsidian';
import type WucaiThinoSyncPlugin from '../../main';

export class WucaiThinoSyncSettingTab extends PluginSettingTab {
    plugin: WucaiThinoSyncPlugin;

    constructor(app: App, plugin: WucaiThinoSyncPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // === 同步开关 ===
        new Setting(containerEl)
            .setName('Enable sync')
            .setDesc('Enable or disable the sync functionality')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableSync)
                .onChange(async (value) => {
                    this.plugin.settings.enableSync = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        this.plugin.startAutoSync();
                    } else {
                        this.plugin.stopAutoSync();
                    }
                }));

        // === 同步模式 ===
        new Setting(containerEl)
            .setName('Sync mode')
            .setDesc('Choose between automatic or manual sync')
            .addDropdown(dropdown => dropdown
                .addOption('manual', 'Manual')
                .addOption('auto', 'Automatic')
                .setValue(this.plugin.settings.syncMode)
                .onChange(async (value: 'auto' | 'manual') => {
                    this.plugin.settings.syncMode = value;
                    await this.plugin.saveSettings();
                    if (value === 'auto' && this.plugin.settings.enableSync) {
                        this.plugin.startAutoSync();
                    } else {
                        this.plugin.stopAutoSync();
                    }
                }));

        // === 自动同步间隔 ===
        new Setting(containerEl)
            .setName('Auto sync interval (minutes)')
            .setDesc('How often to automatically sync (only applies when sync mode is automatic)')
            .addText(text => text
                .setPlaceholder('30')
                .setValue(String(this.plugin.settings.autoSyncInterval))
                .onChange(async (value) => {
                    const interval = parseInt(value) || 30;
                    this.plugin.settings.autoSyncInterval = Math.max(1, interval);
                    await this.plugin.saveSettings();
                    if (this.plugin.settings.syncMode === 'auto' && this.plugin.settings.enableSync) {
                        this.plugin.startAutoSync();
                    }
                }));

        // === 启动时同步 ===
        new Setting(containerEl)
            .setName('Sync on startup')
            .setDesc('Automatically sync when Obsidian starts')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.syncOnStartup)
                .onChange(async (value) => {
                    this.plugin.settings.syncOnStartup = value;
                    await this.plugin.saveSettings();
                }));

        // === 扫描天数 ===
        new Setting(containerEl)
            .setName('Scan days')
            .setDesc('Only scan daily notes from the last N days (0 = scan all files)')
            .addText(text => text
                .setPlaceholder('7')
                .setValue(String(this.plugin.settings.scanDays))
                .onChange(async (value) => {
                    const days = parseInt(value) || 7;
                    this.plugin.settings.scanDays = Math.max(0, days);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl).setName('Folders').setHeading();

        // === WuCai 文件夹 ===
        new Setting(containerEl)
            .setName('WuCai folder')
            .setDesc('The folder where WuCai daily notes are stored (relative to vault root)')
            .addText(text => text
                .setPlaceholder('00-Inbox/external-sync/WuCai')
                .setValue(this.plugin.settings.wucaiFolder)
                .onChange(async (value) => {
                    this.plugin.settings.wucaiFolder = value;
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setButtonText('Browse')
                .onClick(() => {
                    this.openFolderSuggestModal('wucaiFolder');
                }));

        // === Thino 文件夹 ===
        new Setting(containerEl)
            .setName('Thino folder')
            .setDesc('The folder where Thino notes will be created (relative to vault root)')
            .addText(text => text
                .setPlaceholder('00-Inbox/external-sync/thino')
                .setValue(this.plugin.settings.thinoFolder)
                .onChange(async (value) => {
                    this.plugin.settings.thinoFolder = value;
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setButtonText('Browse')
                .onClick(() => {
                    this.openFolderSuggestModal('thinoFolder');
                }));

        new Setting(containerEl).setName('Actions').setHeading();

        // === 手动同步按钮 ===
        new Setting(containerEl)
            .setName('Manual sync')
            .setDesc('Manually trigger a sync operation')
            .addButton(button => button
                .setButtonText('Sync now')
                .setCta()
                .onClick(() => {
                    button.setDisabled(true);
                    button.setButtonText('Syncing...');
                    this.plugin.syncService.syncAll().then(result => {
                        if (result.success) {
                            new Notice(`Sync completed: ${result.createdFiles} created, ${result.skippedEntries} skipped`);
                        } else {
                            new Notice(`Sync failed: ${result.errorMessage}`);
                        }
                    }).catch(e => {
                        new Notice(`Sync error: ${e}`);
                    }).finally(() => {
                        button.setDisabled(false);
                        button.setButtonText('Sync now');
                    });
                }));

        // === 同步状态 ===
        const status = this.plugin.syncService.getSyncStatus();
        new Setting(containerEl)
            .setName('Sync status')
            .setDesc(`Total processed: ${status.totalProcessed} | failed: ${status.failedEntries} | skipped: ${status.skippedEntries}`)
            .addButton(button => button
                .setButtonText('Refresh')
                .onClick(() => {
                    this.display();
                }));

        // === 最后同步时间 ===
        if (status.lastSyncTime) {
            const lastSync = new Date(status.lastSyncTime).toLocaleString();
            containerEl.createEl('p', {
                text: `Last sync: ${lastSync}`,
                cls: 'setting-item-description',
            });
        }

        new Setting(containerEl).setName('Advanced').setHeading();

        // === 调试模式 ===
        new Setting(containerEl)
            .setName('Debug mode')
            .setDesc('Enable verbose logging for troubleshooting')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));

        // === 重置同步状态 ===
        new Setting(containerEl)
            .setName('Reset sync state')
            .setDesc('Clear all processed entries tracking (will re-process all files on next sync)')
            .addButton(button => button
                .setButtonText('Reset')
                .setWarning()
                .onClick(() => {
                    const modal = new ConfirmModal(
                        this.app,
                        'Reset sync state',
                        'Are you sure you want to reset the sync state? This will re-process all files on the next sync.',
                        () => {
                            this.plugin.syncService.resetSyncState().then(() => {
                                new Notice('Sync state has been reset');
                                this.display();
                            }).catch(e => {
                                new Notice(`Reset failed: ${e}`);
                            });
                        }
                    );
                    modal.open();
                }));
    }

    /**
     * 打开文件夹选择模态框
     */
    private openFolderSuggestModal(settingKey: 'wucaiFolder' | 'thinoFolder'): void {
        // 获取所有文件夹
        const folders: string[] = [];
        this.app.vault.getAllLoadedFiles().forEach(file => {
            if (file instanceof TFolder) {
                folders.push(file.path);
            }
        });

        const currentValue = this.plugin.settings[settingKey];
        const modal = new FolderInputModal(
            this.app,
            'Enter folder path',
            currentValue,
            async (newValue) => {
                this.plugin.settings[settingKey] = newValue;
                await this.plugin.saveSettings();
                this.display();
            }
        );
        modal.open();
    }
}

/**
 * 确认对话框 Modal
 */
class ConfirmModal extends Modal {
    private title: string;
    private message: string;
    private onConfirm: () => void;

    constructor(app: App, title: string, message: string, onConfirm: () => void) {
        super(app);
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h3', { text: this.title });
        contentEl.createEl('p', { text: this.message });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        buttonContainer.createEl('button', { text: 'Cancel' })
            .addEventListener('click', () => this.close());
        
        const confirmBtn = buttonContainer.createEl('button', { 
            text: 'Confirm', 
            cls: 'mod-warning' 
        });
        confirmBtn.addEventListener('click', () => {
            this.onConfirm();
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * 文件夹输入 Modal
 */
class FolderInputModal extends Modal {
    private title: string;
    private defaultValue: string;
    private onSubmit: (value: string) => void;

    constructor(app: App, title: string, defaultValue: string, onSubmit: (value: string) => void) {
        super(app);
        this.title = title;
        this.defaultValue = defaultValue;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h3', { text: this.title });

        const inputEl = contentEl.createEl('input', {
            type: 'text',
            value: this.defaultValue,
            cls: 'wucai-thino-sync-modal-input'
        });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        buttonContainer.createEl('button', { text: 'Cancel' })
            .addEventListener('click', () => this.close());
        
        const submitBtn = buttonContainer.createEl('button', { 
            text: 'Submit', 
            cls: 'mod-cta' 
        });
        submitBtn.addEventListener('click', () => {
            this.onSubmit(inputEl.value);
            this.close();
        });

        // 支持回车提交
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.onSubmit(inputEl.value);
                this.close();
            }
        });

        inputEl.focus();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
