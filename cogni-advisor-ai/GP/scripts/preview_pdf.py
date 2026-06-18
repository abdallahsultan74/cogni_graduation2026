#!/usr/bin/env python3
import json
import sys
from pathlib import Path

import pdfplumber

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path(__file__).resolve().parent.parent / "eelu.pdf"
out_path = Path(__file__).resolve().parent.parent / "scripts" / "eelu_extract_preview.json"

result = {"pages": []}
with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        result["pages"].append({
            "page": i + 1,
            "text": page.extract_text() or "",
            "tables": page.extract_tables() or [],
        })

out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {out_path}")
