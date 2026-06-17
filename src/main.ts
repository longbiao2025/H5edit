import "./styles.css";
import { filePathToBaseUrl, serializeHtmlDocument } from "./serialization";
import {
  HtmlFilePayload,
  isTauriRuntime,
  openHtmlFile,
  saveHtmlFile,
  saveHtmlFileAs,
} from "./tauri";

type TextAction = {
  id: number;
  before: string;
  after: string;
  at: number;
};

type TextEntry = {
  id: number;
  node: Text;
};

const skippedTags = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "HEAD",
  "TITLE",
  "META",
  "LINK",
  "BASE",
  "SVG",
  "MATH",
  "TEXTAREA",
  "SELECT",
  "OPTION",
]);

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

app.innerHTML = `
  <main class="shell">
    <header class="toolbar">
      <div class="brand">
        <strong>HTML Text Editor</strong>
        <span id="fileLabel">未打开文件</span>
      </div>
      <div class="toolbarActions">
        <button id="openButton" class="primary">打开 HTML</button>
        <button id="saveButton" disabled>保存</button>
        <button id="saveAsButton" disabled>另存为</button>
        <button id="undoButton" title="撤销" disabled>↶</button>
        <button id="redoButton" title="重做" disabled>↷</button>
        <label class="switch">
          <input id="highlightToggle" type="checkbox" checked />
          <span>高亮</span>
        </label>
      </div>
    </header>

    <section class="workspace">
      <section class="previewPane">
        <div id="emptyState" class="emptyState">
          <h1>打开一个 HTML 文件</h1>
          <p>点击页面里的文字，在右侧修改后保存。应用会先备份原文件。</p>
        </div>
        <iframe id="previewFrame" title="HTML 预览"></iframe>
      </section>

      <aside class="editorPane">
        <div class="panelHeader">
          <span>文字编辑</span>
          <small id="textCounter">0 段文字</small>
        </div>
        <label class="field">
          <span>当前文字</span>
          <textarea id="textEditor" disabled placeholder="在左侧预览中点击一段文字"></textarea>
        </label>
        <div class="details">
          <div>
            <span>状态</span>
            <strong id="statusText">等待打开文件</strong>
          </div>
          <div>
            <span>备份</span>
            <strong id="backupText">保存时自动生成</strong>
          </div>
        </div>
      </aside>
    </section>
  </main>
`;

const fileLabel = mustGet<HTMLSpanElement>("fileLabel");
const openButton = mustGet<HTMLButtonElement>("openButton");
const saveButton = mustGet<HTMLButtonElement>("saveButton");
const saveAsButton = mustGet<HTMLButtonElement>("saveAsButton");
const undoButton = mustGet<HTMLButtonElement>("undoButton");
const redoButton = mustGet<HTMLButtonElement>("redoButton");
const highlightToggle = mustGet<HTMLInputElement>("highlightToggle");
const emptyState = mustGet<HTMLDivElement>("emptyState");
const previewFrame = mustGet<HTMLIFrameElement>("previewFrame");
const textEditor = mustGet<HTMLTextAreaElement>("textEditor");
const textCounter = mustGet<HTMLElement>("textCounter");
const statusText = mustGet<HTMLElement>("statusText");
const backupText = mustGet<HTMLElement>("backupText");

let currentPath = "";
let currentName = "";
let originalHtml = "";
let sourceDoc: Document | null = null;
let textEntries: TextEntry[] = [];
let selectedId: number | null = null;
let dirty = false;
let undoStack: TextAction[] = [];
let redoStack: TextAction[] = [];

openButton.addEventListener("click", () => {
  void handleOpen();
});

saveButton.addEventListener("click", () => {
  void handleSave();
});

saveAsButton.addEventListener("click", () => {
  void handleSaveAs();
});

undoButton.addEventListener("click", () => {
  applyHistory("undo");
});

redoButton.addEventListener("click", () => {
  applyHistory("redo");
});

highlightToggle.addEventListener("change", () => {
  updatePreviewHighlightMode();
});

textEditor.addEventListener("input", () => {
  if (selectedId === null) {
    return;
  }

  const entry = textEntries[selectedId];
  if (!entry) {
    return;
  }

  const before = entry.node.nodeValue ?? "";
  const after = textEditor.value;
  if (before === after) {
    return;
  }

  pushHistory(selectedId, before, after);
  setTextValue(selectedId, after);
  setDirty(true);
});

function mustGet<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element #${id} not found.`);
  }
  return element as T;
}

async function handleOpen(): Promise<void> {
  if (!isTauriRuntime()) {
    setStatus("请在 Tauri 桌面应用中打开文件");
    return;
  }

  try {
    const payload = await openHtmlFile();
    if (!payload) {
      return;
    }
    loadPayload(payload);
  } catch (error) {
    setStatus(formatError(error));
  }
}

function loadPayload(payload: HtmlFilePayload): void {
  currentPath = payload.path;
  currentName = payload.name;
  originalHtml = payload.contents;
  sourceDoc = new DOMParser().parseFromString(payload.contents, "text/html");
  selectedId = null;
  undoStack = [];
  redoStack = [];
  textEditor.value = "";
  textEditor.disabled = true;
  backupText.textContent = "保存时自动生成";
  scanSourceText();
  renderPreview();
  setDirty(false);
  fileLabel.textContent = payload.name;
  textCounter.textContent = `${textEntries.length} 段文字`;
  emptyState.hidden = true;
  saveAsButton.disabled = false;
  setStatus("已打开，点击左侧文字开始修改");
}

function scanSourceText(): void {
  textEntries = [];
  if (!sourceDoc?.body) {
    return;
  }

  const walker = sourceDoc.createTreeWalker(sourceDoc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return isEditableTextNode(node as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  let current = walker.nextNode() as Text | null;
  while (current) {
    textEntries.push({ id: textEntries.length, node: current });
    current = walker.nextNode() as Text | null;
  }
}

function isEditableTextNode(node: Text): boolean {
  if (!node.nodeValue || node.nodeValue.trim().length === 0) {
    return false;
  }

  const parent = node.parentElement;
  if (!parent) {
    return false;
  }

  return !parent.closest(Array.from(skippedTags).join(","));
}

function renderPreview(): void {
  if (!sourceDoc) {
    return;
  }

  previewFrame.addEventListener(
    "load",
    () => {
      preparePreviewDocument();
      updatePreviewHighlightMode();
      if (selectedId !== null) {
        markSelectedPreviewText(selectedId);
      }
    },
    { once: true },
  );

  const clone = sourceDoc.cloneNode(true) as Document;
  addBaseElement(clone);
  previewFrame.srcdoc = serializeHtmlDocument(clone, originalHtml);
}

function addBaseElement(doc: Document): void {
  if (!currentPath || !doc.head) {
    return;
  }

  const baseUrl = filePathToBaseUrl(currentPath);
  if (!baseUrl) {
    return;
  }

  const base = doc.createElement("base");
  base.href = baseUrl;
  doc.head.prepend(base);
}

function preparePreviewDocument(): void {
  const doc = previewFrame.contentDocument;
  if (!doc?.body) {
    return;
  }

  injectPreviewStyles(doc);
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return isEditableTextNode(node as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes: Text[] = [];
  let current = walker.nextNode() as Text | null;
  while (current) {
    nodes.push(current);
    current = walker.nextNode() as Text | null;
  }

  nodes.forEach((node, id) => {
    if (id >= textEntries.length) {
      return;
    }

    const span = doc.createElement("span");
    span.dataset.htmlTextEditorId = String(id);
    span.className = "html-text-editor-target";
    span.textContent = node.nodeValue;
    node.parentNode?.replaceChild(span, node);
  });

  doc.addEventListener(
    "click",
    (event) => {
      const target = (event.target as Element | null)?.closest("[data-html-text-editor-id]");
      if (!target) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      selectText(Number((target as HTMLElement).dataset.htmlTextEditorId));
    },
    true,
  );
}

function injectPreviewStyles(doc: Document): void {
  const style = doc.createElement("style");
  style.textContent = `
    .html-text-editor-target {
      cursor: text !important;
      border-radius: 3px !important;
      transition: box-shadow 120ms ease, background 120ms ease !important;
    }

    body.html-text-editor-highlight .html-text-editor-target {
      box-shadow: 0 0 0 1px rgba(30, 111, 255, 0.42) !important;
      background: rgba(255, 235, 59, 0.18) !important;
    }

    .html-text-editor-target:hover,
    .html-text-editor-target.html-text-editor-selected {
      box-shadow: 0 0 0 2px #1e6fff !important;
      background: rgba(30, 111, 255, 0.14) !important;
    }
  `;
  doc.head?.append(style);
}

function selectText(id: number): void {
  const entry = textEntries[id];
  if (!entry) {
    return;
  }

  selectedId = id;
  textEditor.disabled = false;
  textEditor.value = entry.node.nodeValue ?? "";
  textEditor.focus();
  textEditor.select();
  markSelectedPreviewText(id);
  setStatus(`正在编辑第 ${id + 1} 段文字`);
}

function markSelectedPreviewText(id: number): void {
  const doc = previewFrame.contentDocument;
  if (!doc) {
    return;
  }

  doc.querySelectorAll(".html-text-editor-selected").forEach((element) => {
    element.classList.remove("html-text-editor-selected");
  });

  doc
    .querySelector(`[data-html-text-editor-id="${id}"]`)
    ?.classList.add("html-text-editor-selected");
}

function updatePreviewHighlightMode(): void {
  previewFrame.contentDocument?.body?.classList.toggle(
    "html-text-editor-highlight",
    highlightToggle.checked,
  );
}

function pushHistory(id: number, before: string, after: string): void {
  const last = undoStack[undoStack.length - 1];
  const now = Date.now();
  if (last && last.id === id && now - last.at < 800) {
    last.after = after;
    last.at = now;
  } else {
    undoStack.push({ id, before, after, at: now });
  }

  redoStack = [];
  updateHistoryButtons();
}

function applyHistory(direction: "undo" | "redo"): void {
  const from = direction === "undo" ? undoStack : redoStack;
  const to = direction === "undo" ? redoStack : undoStack;
  const action = from.pop();
  if (!action) {
    return;
  }

  const nextValue = direction === "undo" ? action.before : action.after;
  setTextValue(action.id, nextValue);
  to.push({ ...action, at: Date.now() });
  selectedId = action.id;
  textEditor.disabled = false;
  textEditor.value = nextValue;
  markSelectedPreviewText(action.id);
  setDirty(true);
  updateHistoryButtons();
}

function setTextValue(id: number, value: string): void {
  const entry = textEntries[id];
  if (!entry) {
    return;
  }

  entry.node.nodeValue = value;
  const previewTarget = previewFrame.contentDocument?.querySelector(
    `[data-html-text-editor-id="${id}"]`,
  );
  if (previewTarget) {
    previewTarget.textContent = value;
  }
}

async function handleSave(): Promise<void> {
  if (!sourceDoc || !currentPath) {
    return;
  }

  try {
    const contents = serializeHtmlDocument(sourceDoc, originalHtml);
    const result = await saveHtmlFile(currentPath, contents);
    originalHtml = contents;
    setDirty(false);
    backupText.textContent = result.backup_path || "无";
    setStatus("已保存");
  } catch (error) {
    setStatus(formatError(error));
  }
}

async function handleSaveAs(): Promise<void> {
  if (!sourceDoc) {
    return;
  }

  try {
    const contents = serializeHtmlDocument(sourceDoc, originalHtml);
    const result = await saveHtmlFileAs(currentName || "page.html", contents);
    if (!result) {
      return;
    }
    currentPath = result.path;
    currentName = result.path.split(/[\\/]/).pop() ?? "page.html";
    originalHtml = contents;
    fileLabel.textContent = currentName;
    backupText.textContent = result.backup_path || "新文件";
    setDirty(false);
    renderPreview();
    setStatus("已另存为");
  } catch (error) {
    setStatus(formatError(error));
  }
}

function setDirty(value: boolean): void {
  dirty = value;
  saveButton.disabled = !sourceDoc || !currentPath || !dirty;
  saveAsButton.disabled = !sourceDoc;
  updateHistoryButtons();
  document.title = `${dirty ? "*" : ""}HTML Text Editor`;
}

function updateHistoryButtons(): void {
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function setStatus(value: string): void {
  statusText.textContent = value;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
