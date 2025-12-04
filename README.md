# Wucai Thino Sync

[中文文档](./README-zh.md)

An Obsidian plugin that automatically syncs personal insights from [WuCai](https://www.dotalk.cn/product/wucai) Daily Notes to [Thino](https://github.com/Quorafind/Obsidian-Thino) format, perfectly displaying your fleeting thoughts through Thino.

## ✨ Features

- 📝 Automatically parse timestamp entries under the `## Daily note` section in WuCai Daily Notes
- 🔄 Convert each insight into an independent Thino note file
- 🏷️ Automatically add `#wucai` tag for easy filtering
- ⏰ Support both manual and automatic sync modes
- 📅 Configurable scan days, default to process only the last 7 days
- 🔒 Smart deduplication, synced entries won't be processed again
- 💾 Conflict handling: existing Thino files will be skipped

## 📋 Prerequisites

This plugin requires the following two plugins:

### 1. WuCai Plugin

Enable the **Daily Note sync configuration** (official default), template format:

```jinja2
{% block highlights %}
{% if isdailynote  %}
## Daily note
{{ highlights | style_dailynote }}
{% else %}
## Highlights
{% for item in highlights %}
{{ item | style1({prefix:"> ", anno:"> __Thought__: ", color:"█  "}) }}
{% endfor %}
{% endif %}
{% endblock %}
```

WuCai generates Daily Note files in the following format:

**Filename format**: `Daily Note YYYY-MM-DD-YYYYMMDD.md`

**Content format**:
```markdown
## Daily note

- 2025-12-04 10:30
    This is my insight content...

- 2025-12-04 14:15
    This is another insight content...
```

### 2. Thino Plugin

Enable **Multi mode** and specify the folder for Thino notes.

Thino Multi mode stores each note as an independent Markdown file. This plugin generates files in the following format:

**Filename format**: `YYYYMMDD-{16-char ID}.md`

**Content format**:
```yaml
---
id: a1b2c3d4e5f6g7h8
createdAt: 2025/12/04 10:30:00
updatedAt: 2025/12/04 10:30:00
thinoType: JOURNAL
tags: [wucai]
---

This is my insight content...
```

## 🚀 Installation

### Manual Installation

1. Download the latest Release (`main.js`, `manifest.json`, `styles.css`)
2. Create folder in your Vault: `.obsidian/plugins/wucai-thino-sync/`
3. Copy the downloaded files to that folder
4. Restart Obsidian
5. Enable `Wucai Thino Sync` in **Settings → Community plugins**

### Install from dist directory

```bash
cp dist/* <your-vault>/.obsidian/plugins/wucai-thino-sync/
```

## ⚙️ Configuration

Configure in **Settings → Wucai Thino Sync**:

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable sync** | Enable/disable sync functionality | Off |
| **Sync mode** | Sync mode: Manual / Automatic | Manual |
| **Auto sync interval** | Auto sync interval (minutes) | 30 |
| **Scan days** | Days to scan, 0 means scan all | 7 |
| **Sync on startup** | Auto sync when Obsidian starts | Off |
| **WuCai folder** | WuCai Daily Note folder path | Required |
| **Thino folder** | Thino notes folder path | Required |
| **Debug mode** | Enable debug logging | Off |

## 📖 Usage

### Method 1: Manual Sync

1. Click the **sync icon** (🔄) in the left ribbon
2. Or use Command Palette (Ctrl/Cmd + P) and run `Sync WuCai to Thino`

### Method 2: Automatic Sync

1. Set **Sync mode** to `Automatic` in settings
2. Set **Auto sync interval** to your desired interval
3. Enable **Enable sync**

### Reset Sync State

To reprocess all files, click the **Reset** button in settings to clear sync records.

## 🔧 Development

```bash
# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Production build
npm run build

# Package to dist directory
mkdir -p dist && cp main.js manifest.json styles.css dist/
```

## 📁 Project Structure

```
wucai-thino-sync/
├── main.ts                      # Plugin entry point
├── src/
│   ├── settings.ts              # Settings interface and defaults
│   ├── types.ts                 # TypeScript type definitions
│   ├── parsers/
│   │   └── daily-note-parser.ts # WuCai file parser
│   ├── sync/
│   │   ├── sync-service.ts      # Main sync service
│   │   └── thino-converter.ts   # Thino format converter
│   └── ui/
│       └── settings-tab.ts      # Settings panel UI
└── dist/                        # Build output directory
```

## 🤝 Related Projects

- [WuCai](https://www.dotalk.cn/product/wucai) - Web highlighting and note-taking tool
- [Obsidian Thino](https://github.com/Quorafind/Obsidian-Thino) - Idea capture and fleeting notes

## 📄 License

MIT License

## 🙏 Acknowledgments

Thanks to WuCai and Thino plugins for bringing excellent experiences to Obsidian users.
