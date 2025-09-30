//
// PUBLIC_INTERFACE
// templateStorage.js
// Provides persistence and retrieval for user-uploaded DOCX templates per SOW type (FP/TM).
// Uses IndexedDB via browser Cache API-like pattern with base64 in localStorage for simplicity.
// Note: For large files, IndexedDB is preferred; here we base64-encode for portability.

const KEY = 'userDocxTemplates.v1'; // structure: { FP?: { name, mime, b64 }, TM?: { name, mime, b64 } }

/**
 * Load current map from localStorage.
 */
function loadMap() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Save map to localStorage.
 */
function saveMap(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map || {}));
  } catch {
    // storage may be full; ignore here (UI will still use in-memory)
  }
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.readAsDataURL(blob);
  }).then((dataUrlB64) => dataUrlB64);
}

// PUBLIC_INTERFACE
export async function saveTemplateForType(type, fileOrBlob) {
  /** Save a DOCX File/Blob for the given type ("FP"|"TM") to localStorage as base64 */
  if (!type || (type !== 'FP' && type !== 'TM')) throw new Error('Type must be FP or TM');
  if (!fileOrBlob) throw new Error('No file provided');
  const name = fileOrBlob.name || `template_${type}.docx`;
  const mime = fileOrBlob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const b64 = await (async () => {
    if (typeof File !== 'undefined' && fileOrBlob instanceof File) {
      return blobToBase64(fileOrBlob);
    }
    if (typeof Blob !== 'undefined' && fileOrBlob instanceof Blob) {
      return blobToBase64(fileOrBlob);
    }
    // ArrayBuffer?
    if (fileOrBlob instanceof ArrayBuffer) {
      const u8 = new Uint8Array(fileOrBlob);
      let binary = '';
      for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
      return btoa(binary);
    }
    throw new Error('Unsupported file type');
  })();

  const map = loadMap();
  map[type] = { name, mime, b64 };
  saveMap(map);
  return true;
}

// PUBLIC_INTERFACE
export function hasUserTemplate(type) {
  /** Returns true if a user template is stored for the given type */
  const map = loadMap();
  return !!(map && map[type] && map[type].b64);
}

// PUBLIC_INTERFACE
export function getActiveTemplateInfo(type) {
  /**
   * Returns which template is active for the type:
   * { source: "user"|"bundled", name?: string }
   */
  const map = loadMap();
  if (map && map[type] && map[type].b64) {
    return { source: 'user', name: map[type].name || `template_${type}.docx` };
  }
  return { source: 'bundled' };
}

// PUBLIC_INTERFACE
export function getUserTemplateBlob(type) {
  /** Returns a Blob for the stored user template, or null if not available */
  const map = loadMap();
  const rec = map && map[type];
  if (!rec || !rec.b64) return null;
  const { b64, mime, name } = rec;
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  blob.name = name || `template_${type}.docx`;
  return blob;
}
