import React, { useMemo } from 'react';

/**
 * PUBLIC_INTERFACE
 * SowPreamble
 * Render the required preamble sentence with live interpolation from form state.
 *
 * Props:
 * - value: object containing at least { preamble?: { startDate?: string, endDate?: string, supplier?: string } }
 * - onChange: (nextPartial) => void to update fields under value.preamble
 * - sentenceTemplate?: string optional template that may contain {{startDate}}, {{endDate}}, {{supplier}}
 *
 * The component also renders three inputs (Start Date, End Date, Supplier) outside of any table.
 */
export default function SowPreamble({ value, onChange, sentenceTemplate }) {
  const preamble = value?.preamble || {};
  const startDate = preamble.startDate || "";
  const endDate = preamble.endDate || "";
  const supplier = preamble.supplier || "";

  const interpolated = useMemo(() => {
    const template =
      typeof sentenceTemplate === "string" && sentenceTemplate.trim()
        ? sentenceTemplate
        : "The Statement of Work references and is executed subject to and in accordance with the terms and conditions contained in the Master Services Agreement entered between [{{startDate}} - {{endDate}}], and [{{supplier}}] (the “Supplier”), as amended from time to time (the “Agreement”). Capitalized terms not defined in this Statement of Work have the meaning given in the Agreement. This Statement of Work becomes effective when signed by Supplier where indicated below in the Section headed ‘Authorization’.";
    const range =
      startDate || endDate
        ? `[${startDate || ""}${startDate && endDate ? " - " : ""}${endDate || ""}]`
        : "[startdate - enddate]";
    const sup = supplier ? `[${supplier}]` : "[supplier]";
    return template
      .replaceAll("{{startDate}}", startDate || "startdate")
      .replaceAll("{{endDate}}", endDate || "enddate")
      .replaceAll("{{supplier}}", supplier || "supplier")
      .replaceAll("[{{startDate}} - {{endDate}}]", range)
      .replaceAll("[{{supplier}}]", sup);
  }, [sentenceTemplate, startDate, endDate, supplier]);

  const update = (patch) => {
    onChange?.({
      ...value,
      preamble: { ...(value?.preamble || {}), ...patch },
    });
  };

  return (
    <div className="w-full" style={{ color: '#374151' }}>
      {/* Metadata inputs controlling the sentence */}
      <div className="panel" style={{ padding: 8, marginBottom: 8 }}>
        <div className="panel-title" style={{ marginBottom: 6 }}>Preamble Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', rowGap: 8, columnGap: 10 }}>
          <label htmlFor="pre-start" style={{ alignSelf: 'center' }}>Start Date</label>
          <input
            id="pre-start"
            className="input"
            type="text"
            placeholder="dd-mm-yyyy"
            value={startDate}
            onChange={(e) => update({ startDate: e.target.value })}
          />
          <label htmlFor="pre-end" style={{ alignSelf: 'center' }}>End Date</label>
          <input
            id="pre-end"
            className="input"
            type="text"
            placeholder="dd-mm-yyyy"
            value={endDate}
            onChange={(e) => update({ endDate: e.target.value })}
          />
          <label htmlFor="pre-supplier" style={{ alignSelf: 'center' }}>Supplier</label>
          <input
            id="pre-supplier"
            className="input"
            type="text"
            placeholder="Supplier name"
            value={supplier}
            onChange={(e) => update({ supplier: e.target.value })}
          />
        </div>
      </div>

      {/* Interpolated sentence */}
      <p className="text-gray-700 leading-relaxed" style={{ color: '#374151', lineHeight: 1.6, marginTop: 4, marginBottom: 8 }}>
        {interpolated}
      </p>
    </div>
  );
}
