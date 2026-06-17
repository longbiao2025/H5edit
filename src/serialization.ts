export function hasHtmlDoctype(html: string): boolean {
  return /^\s*<!doctype\s+html[\s>]/i.test(html);
}

export function serializeHtmlDocument(doc: Document, originalHtml: string): string {
  const doctype = hasHtmlDoctype(originalHtml) ? "<!doctype html>\n" : "";
  return `${doctype}${doc.documentElement.outerHTML}`;
}

export function filePathToBaseUrl(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const directory = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/") + 1) : "";
  if (!directory) {
    return "";
  }

  if (/^[a-zA-Z]:\//.test(directory)) {
    return encodeURI(`file:///${directory}`);
  }

  if (directory.startsWith("/")) {
    return encodeURI(`file://${directory}`);
  }

  return encodeURI(directory);
}
