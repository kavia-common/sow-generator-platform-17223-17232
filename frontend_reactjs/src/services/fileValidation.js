export function ensureDocxFileOrThrow(fileLike) {
  /**
   * PUBLIC_INTERFACE
   * ensureDocxFileOrThrow
   * Validates that the provided File/Blob has .docx characteristics before upload/merge:
   * - Name ends with .docx OR MIME type suggests docx/zip/octet-stream
   * Throws a descriptive error if invalid.
   */
  if (!fileLike) throw new Error("No file provided");
  const name = (fileLike.name || "").toLowerCase();
  const type = (fileLike.type || "").toLowerCase();
  const isDocxExt = name.endsWith(".docx");
  const isDocxMime =
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "application/zip" ||
    type === "application/octet-stream" ||
    type === "application/x-zip-compressed";
  if (!isDocxExt && !isDocxMime) {
    throw new Error("Unsupported file type. Please select a .docx file (binary Word document).");
  }
  return true;
}
