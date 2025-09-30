Place fallback images here for DOCX generation:

- default_logo.png (recommended ~180x56 px, transparent background)
- default_signature.png (recommended ~240x80 px, on white background for best legibility)

Generation behavior:
- If the DOCX template contains {{logo}}, the app will insert:
  1) data.meta.logoUrl (if provided, as a data URL), else
  2) /assets/default_logo.png (if present)

- If the DOCX template contains {{signature}}, the app will insert:
  1) data.templateData.signature or data.templateData.authorization_signatures.signature (if provided, as a data URL), else
  2) /assets/default_signature.png (if present)

Sizing defaults:
- logo: 180x56 px
- signature: 240x80 px

You can adjust sizes by editing imageSize in DocxPreviewAndGenerate.jsx.
