import { invoke } from "@tauri-apps/api/core";

export interface HtmlFilePayload {
  path: string;
  name: string;
  contents: string;
}

export interface SavePayload {
  path: string;
  backup_path: string;
}

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export async function openHtmlFile(): Promise<HtmlFilePayload | null> {
  return invoke<HtmlFilePayload | null>("open_html_file");
}

export async function saveHtmlFile(path: string, contents: string): Promise<SavePayload> {
  return invoke<SavePayload>("save_html_file", { path, contents });
}

export async function saveHtmlFileAs(
  defaultName: string | null,
  contents: string,
): Promise<SavePayload | null> {
  return invoke<SavePayload | null>("save_html_file_as", {
    defaultName,
    contents,
  });
}
