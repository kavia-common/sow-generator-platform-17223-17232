//
// PUBLIC_INTERFACE
/**
 * Label utilities for normalizing and filtering labels across preview and DOCX export.
 * Keep this module side-effect free so it can be imported dynamically in builders or statically in UI.
 */
//

 // PUBLIC_INTERFACE
export function normalizeLabel(label) {
  /** Normalize composite labels to concise canonical labels.
   * Examples:
   * - "Supplier Name, Contact Name, Email and Address — Supplier Name" -> "Supplier Name"
   * - "Address for Communications — Contact Name" -> "Contact Name"
   * - "[company name] (Client)" -> "company name (Client)" (case normalized externally)
   */
  const raw = String(label || "").trim();
  if (!raw) return "";

  // Split on separators "—", "-", ":" and commas to detect sublabels
  // Prefer the last segment after em dash/colon when structured like "Group — Field"
  const dashSplit = raw.split(/—|-/).map((s) => s.trim()).filter(Boolean);
  let candidate = raw;
  if (dashSplit.length > 1) {
    // If pattern "Group — Field", take the last segment
    candidate = dashSplit[dashSplit.length - 1];
  }

  // Further strip list-like composites like "A, B, C and D — D"
  // If suffix appears in the prefix list, keep suffix only
  const parts = candidate.split(/,| and /i).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    // Heuristic: single-word items like "Email", "Address", "Supplier Name"
    // Keep the last if it seems a field name and appears in the string
    const tail = parts[parts.length - 1];
    if (raw.toLowerCase().includes(`— ${tail.toLowerCase()}`) || raw.toLowerCase().endsWith(tail.toLowerCase())) {
      candidate = tail;
    }
  }

  // Clean quotes and extra brackets but keep things like "(Client)"
  candidate = candidate.replace(/^\[+|\]+$/g, "").trim();
  candidate = candidate.replace(/^"+|"+$/g, "").trim();

  // Canonical mapping for known verbose patterns and variants
  const CANONICAL = {
    "supplier": "Supplier",
    "supplier name": "Supplier Name",
    "<supplier name>": "Supplier Name",
    "contact name": "Contact Name",
    "email": "Email",
    "address": "Address",
    "client": "Client",
    "company name": "Company Name",
    // Canonicalize Agreement Date variants including bracketed hints
    "agreement date": "Agreement Date",
    "agreement date [start date]": "Agreement Date",
    "agreement date [ start date ]": "Agreement Date",
    "agreement date [start]": "Agreement Date",
    "agreement date (start date)": "Agreement Date",
    "agreement date [start date] (start date)": "Agreement Date",
    "agreement date [start date] (agreement date)": "Agreement Date",
    "agreement date [start date] (agreement start date)": "Agreement Date",
    "agreement date [start date] (start)": "Agreement Date",
    "agreement start date": "Agreement Date",
    "start date": "Start Date",
    "end date": "End Date",
    "supplier signature": "Supplier Signature",
    "client signature": "Client Signature",
    "supplier signature name": "Supplier Signature Name",
    "client signature name": "Client Signature Name",
  };
  const lc = candidate.toLowerCase();
  if (CANONICAL[lc]) return CANONICAL[lc];

  // Remove trailing bracketed hints like "[start date]" or "(optional)" keeping main field
  candidate = candidate.replace(/\s*\[[^\]]+\]\s*$/g, "").replace(/\s*\(optional\)\s*$/i, "").trim();

  // Title case basic fields if they are short
  if (candidate.length <= 40) {
    return candidate.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
  }
  return candidate;
}

 // PUBLIC_INTERFACE
export function shouldExcludeFromAllEnteredFields(label) {
  /** Exclude specific labels from "All Entered Fields" per requirements and variants. */
  const raw = String(label || "");
  const lbl = raw.toLowerCase().trim();

  if (!lbl) return false;

  // Generic removals from preamble/titles
  if (lbl === "description") return true;
  if (lbl.includes("point of contact")) return true;
  if (lbl === "work order parameters") return true;
  if (lbl.includes("work order") || lbl.includes("work_order")) return true;

  // Titles/headers/inline bits before Client Portfolio
  if (lbl === "statement of work" || lbl === "statement of work (t&m)") return true;
  if (lbl === "to") return true;
  if (lbl === "master services agreement") return true;
  if (lbl === "add logo here" || lbl === "[add logo here]") return true;

  // Explicit exclusions provided by task including Agreement Date variants
  const EXCLUDE_LABELS = new Set([
    // Agreement Date and aliases - ensure none appear in All Entered Fields
    "agreement date",
    "agreement date [start date]",
    "agreement date [ start date ]",
    "agreement date [start]",
    "agreement date (start date)",
    "agreement date [start date] (start date)",
    "agreement date [start date] (agreement date)",
    "agreement date [start date] (agreement start date)",
    "agreement date [start date] (start)",
    "agreement start date",
    "start date",
    "end date",
    // Common global removals
    "company name",
    "client",
    "supplier",
    "supplier name",
    "<supplier name>",
    "[company name] (client)",
    "[company name](client)",
    "company name (client)",
    "client (company name)",
    // Signatures to be excluded from All Entered Fields
    "supplier signature",
    "client signature",
    "supplier signature name",
    "client signature name",
    "supplier signature title",
    "client signature title",
    "supplier signature date",
    "client signature date",
  ]);

  if (EXCLUDE_LABELS.has(lbl)) return true;

  // Normalize patterns like "[company name] (Client)" with spacing variants
  const compact = lbl.replace(/\s+/g, " ").trim();
  const norm = compact.replace(/\s*\(\s*/g, " (").replace(/\s*\)\s*/g, ")");
  if ((/\bcompany name\b/.test(norm) || /\bclient\b/.test(norm)) && /\(client\)/.test(norm)) return true;
  if (norm.includes("company name") && norm.includes("client")) return true;

  // Also exclude any label that contains "agreement date" anywhere
  if (lbl.includes("agreement date")) return true;

  // Generic signature keyword-based catch-all
  if (/\bsignature\b/.test(lbl)) return true;

  return false;
}

// PUBLIC_INTERFACE
export function shouldExcludeKey(key) {
  /** Heuristic dotted-key or snake-case key filter aligned to shouldExcludeFromAllEnteredFields */
  const k = String(key || "").toLowerCase();
  if (!k) return false;
  if (k.includes("signature")) return true;
  if (k.includes("agreement_date") || k.includes("agreement start date")) return true;
  if (k.includes("start_date") || k.includes("end_date")) return true;
  if (k.includes("logo")) return true;
  return false;
}
