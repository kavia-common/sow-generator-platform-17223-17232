This folder will contain parsed representations of DOCX transcripts for quick inspection during development.
At runtime, use services/runTemplateParsing.js or templates/index.js:getDynamicSchemaFromAttachment to retrieve structured sections and dynamic schema for:
- Supplier SOW (T&M) -> attachments/20250930_035345_T&M_Supplier_SoW_Template(docx).txt
- Supplier SOW (Fixed Price) -> attachments/20250930_035346_Fixed price_Supplier_SoW_Template(docx).txt

Parsed JSON files are not auto-persisted in the app; they are examples/placeholders to show structure.
