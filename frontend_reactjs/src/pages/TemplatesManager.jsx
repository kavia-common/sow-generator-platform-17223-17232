import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

// PUBLIC_INTERFACE
export default function TemplatesManager() {
  /**
   * Templates Manager
   * - Create, view, edit, delete SOW templates
   * - Connected to Supabase 'templates' table
   */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // { id?, name, type, body }
  const [error, setError] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => String(a.name || "").localeCompare(b.name || ""));
  }, [items]);

  const fetchItems = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.from("templates").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      setError(e.message || "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const startNew = () => {
    setEditing({ name: "", type: "FP", body: "" });
  };

  const startEdit = (tpl) => {
    setEditing({ id: tpl.id, name: tpl.name || "", type: tpl.type || "FP", body: tpl.body || "" });
  };

  const cancelEdit = () => setEditing(null);

  const save = async () => {
    if (!editing?.name?.trim()) {
      setError("Template name is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (editing.id) {
        const { data, error } = await supabase
          .from("templates")
          .update({ name: editing.name, type: editing.type, body: editing.body })
          .eq("id", editing.id)
          .select();
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("templates")
          .insert([{ name: editing.name, type: editing.type, body: editing.body }])
          .select();
        if (error) throw error;
      }
      await fetchItems();
      setEditing(null);
    } catch (e) {
      setError(e.message || "Failed to save template.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (tpl) => {
    if (!window.confirm(`Delete template "${tpl.name}"? This cannot be undone.`)) return;
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.from("templates").delete().eq("id", tpl.id);
      if (error) throw error;
      setItems((prev) => prev.filter((x) => x.id !== tpl.id));
    } catch (e) {
      setError(e.message || "Failed to delete template.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">Templates Manager</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" type="button" onClick={startNew}>New Template</button>
        <button className="btn" type="button" onClick={fetchItems} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
        {error ? (
          <span role="alert" style={{ color: "#EF4444" }}>{error}</span>
        ) : null}
      </div>

      {/* Edit/Create form */}
      {editing ? (
        <div className="panel" style={{ marginBottom: 12, borderColor: "var(--ui-border)" }}>
          <div className="form-grid">
            <div className="form-control">
              <label className="label">Name</label>
              <input
                className="input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Fixed Price - Web App"
              />
            </div>
            <div className="form-control">
              <label className="label">Type</label>
              <select
                className="select"
                value={editing.type || "FP"}
                onChange={(e) => setEditing({ ...editing, type: e.target.value })}
              >
                <option value="FP">Fixed Price</option>
                <option value="TM">Time & Materials</option>
              </select>
            </div>
            <div className="form-control" style={{ gridColumn: "1 / -1" }}>
              <label className="label">Body</label>
              <textarea
                className="textarea"
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                placeholder="Template content with placeholders like {{project_title}}, {{deliverables}}..."
                style={{ minHeight: 200 }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? "Saving..." : "Save"}</button>
            <button className="btn" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      ) : null}

      {/* List */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        {sorted.length === 0 ? (
          <div className="panel" style={{ borderStyle: "dashed" }}>
            <div style={{ color: "var(--text-secondary)" }}>No templates found. Click "New Template" to add one.</div>
          </div>
        ) : (
          sorted.map((tpl) => (
            <div key={tpl.id} className="panel" style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 800 }}>
                  {tpl.name} <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>({tpl.type || "?"})</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => startEdit(tpl)}>Edit</button>
                  <button className="btn" onClick={() => remove(tpl)} title="Delete">Delete</button>
                </div>
              </div>
              {tpl.body ? (
                <div className="preview" style={{ boxShadow: "none", background: "rgba(255,255,255,0.02)" }}>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{tpl.body}</pre>
                </div>
              ) : (
                <div style={{ color: "var(--text-secondary)" }}>No body content</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
