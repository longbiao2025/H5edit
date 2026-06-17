use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
struct HtmlFilePayload {
    path: String,
    name: String,
    contents: String,
}

#[derive(Serialize)]
struct SavePayload {
    path: String,
    backup_path: String,
}

#[tauri::command]
fn open_html_file() -> Result<Option<HtmlFilePayload>, String> {
    let Some(path) = rfd::FileDialog::new()
        .add_filter("HTML", &["html", "htm"])
        .pick_file()
    else {
        return Ok(None);
    };

    read_html_payload(path).map(Some)
}

#[tauri::command]
fn save_html_file(path: String, contents: String) -> Result<SavePayload, String> {
    let path = PathBuf::from(path);
    if !path.exists() {
        return Err("原文件不存在，请使用另存为。".to_string());
    }

    let backup_path = backup_existing_file(&path)?;
    fs::write(&path, contents).map_err(|err| format!("保存失败：{err}"))?;

    Ok(SavePayload {
        path: path_to_string(&path),
        backup_path: path_to_string(&backup_path),
    })
}

#[tauri::command]
fn save_html_file_as(
    default_name: Option<String>,
    contents: String,
) -> Result<Option<SavePayload>, String> {
    let mut dialog = rfd::FileDialog::new().add_filter("HTML", &["html", "htm"]);
    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }

    let Some(path) = dialog.save_file() else {
        return Ok(None);
    };

    let backup_path = if path.exists() {
        backup_existing_file(&path)?
    } else {
        PathBuf::new()
    };

    fs::write(&path, contents).map_err(|err| format!("另存为失败：{err}"))?;

    Ok(Some(SavePayload {
        path: path_to_string(&path),
        backup_path: path_to_string(&backup_path),
    }))
}

fn read_html_payload(path: PathBuf) -> Result<HtmlFilePayload, String> {
    let contents = fs::read_to_string(&path).map_err(|err| format!("读取文件失败：{err}"))?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("未命名.html")
        .to_string();

    Ok(HtmlFilePayload {
        path: path_to_string(&path),
        name,
        contents,
    })
}

fn backup_existing_file(path: &Path) -> Result<PathBuf, String> {
    let backup_path = next_backup_path(path)?;
    fs::copy(path, &backup_path).map_err(|err| format!("备份失败：{err}"))?;
    Ok(backup_path)
}

fn next_backup_path(path: &Path) -> Result<PathBuf, String> {
    let parent = path.parent().unwrap_or_else(|| Path::new(""));
    let stem = path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .ok_or_else(|| "无法识别文件名。".to_string())?;
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or("html");
    let simple = parent.join(format!("{stem}.backup.{extension}"));

    if !simple.exists() {
        return Ok(simple);
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| format!("生成备份名失败：{err}"))?
        .as_secs();
    Ok(parent.join(format!("{stem}.backup-{timestamp}.{extension}")))
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_html_file,
            save_html_file,
            save_html_file_as
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
