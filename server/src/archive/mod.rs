pub mod images;

use crate::utils::{self, ToStringExt};
use std::{
  fs,
  io::{Cursor, Read},
  path::Path,
};
use zip::ZipArchive;

pub struct ZipArchiveData {
  pub file: ZipArchive<Cursor<Vec<u8>>>,
}

pub struct ZipFile {
  filename: String,
  contents: Vec<u8>,
}

pub fn read_zip(path: &impl AsRef<Path>) -> anyhow::Result<ZipArchiveData> {
  let file_contents = fs::read(path)?;
  let cursor = Cursor::new(file_contents);
  let file = ZipArchive::new(cursor)?;

  Ok(ZipArchiveData { file })
}

pub fn get_image_filenames(zip: &mut ZipArchive<Cursor<Vec<u8>>>) -> anyhow::Result<Vec<String>> {
  let mut filenames = vec![];

  for i in 0..zip.len() {
    let file = zip.by_index(i)?;
    let filename = file.enclosed_name().unwrap().to_string();

    if !utils::is_image(&filename) {
      continue;
    }

    filenames.push(filename);
  }

  filenames.sort_by(|a, b| natord::compare(a, b));

  Ok(filenames)
}

pub fn get_zip_files(
  filenames: Vec<String>,
  zip: &mut ZipArchive<Cursor<Vec<u8>>>,
) -> anyhow::Result<Vec<ZipFile>> {
  let mut files: Vec<ZipFile> = vec![];

  for filename in filenames {
    let mut file = zip.by_name(&filename)?;
    let filename = file.enclosed_name().unwrap().to_string();

    if !utils::is_image(&filename) {
      continue;
    }

    let mut buf = vec![];
    file.read_to_end(&mut buf)?;
    files.push(ZipFile {
      filename,
      contents: buf,
    });
  }

  files.sort_by(|a, b| natord::compare(&a.filename, &b.filename));

  Ok(files)
}
