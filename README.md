# HTML Text Editor

一个面向本地单文件 H5 页面的 macOS 桌面文字编辑器。它只让你点击和修改页面里的可见文字，保存前会自动备份原 HTML 文件。

## 功能

- 打开 `.html` / `.htm` 文件。
- 在应用里所见即所得预览页面。
- 点击页面文字后在右侧编辑。
- 实时更新预览。
- 支持撤销、重做、保存、另存为。
- 保存前生成 `*.backup.html`，已有备份时生成带时间戳的备份。

## 开发运行

```bash
npm install
npm run tauri:dev
```

## 打包 macOS 应用

```bash
npm run tauri:build
```

macOS 上会输出 `.app` / `.dmg`。如果要同时产出 Apple Silicon 和 Intel 通用包，需要在 macOS 构建机安装对应 Rust target 后按 Tauri 的 macOS universal 构建方式处理。

## 说明

第一版使用浏览器 DOM 解析和序列化 HTML。它不会修改脚本、样式、属性、图片路径或链接地址，但保存时浏览器可能会标准化 HTML 的局部空白、标签大小写或属性引号。每次保存前都会备份，方便回退。
