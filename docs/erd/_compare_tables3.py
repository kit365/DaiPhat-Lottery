# -*- coding: utf-8 -*-
import html
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DRAWIO = Path(r"C:\Users\phuja\Downloads\logical_final (1).drawio")
MERMAID = Path(r"c:\DaiPhat_Clone\docs\erd\DaiPhatLottery_ERD-logical-corrected.md")

root = ET.parse(DRAWIO).getroot()

user_tables = set()
for cell in root.iter("mxCell"):
    if cell.get("vertex") != "1":
        continue
    style = cell.get("style") or ""
    if "shape=table" not in style or "shape=tableRow" in style:
        continue
    val = cell.get("value") or ""
    clean = html.unescape(val)
    clean = re.sub(r"<[^>]+>", "", clean).strip()
    # table name often in first line; may include braille blank \u2800
    clean = clean.replace("\u2800", "").strip()
    name = clean.split("\n")[0].strip()
    if name:
        user_tables.add(name)

text = MERMAID.read_text(encoding="utf-8")
body = re.search(r"```mermaid\n(.*?)\n```", text, re.S).group(1)
mermaid_tables = set(re.findall(r"^\s{2}(\w+)\s*\{", body, re.M))

# normalize case
user_norm = {t.lower(): t for t in user_tables}
mermaid_norm = {t.lower(): t for t in mermaid_tables}

missing = sorted(set(mermaid_norm) - set(user_norm))
extra = sorted(set(user_norm) - set(mermaid_norm))
common = sorted(set(mermaid_norm) & set(user_norm))

print(f"Ban Logical (draw.io): {len(user_tables)} bang")
print(f"Ban day du (Mermaid/he thong): {len(mermaid_tables)} bang")
print(f"Chung: {len(common)}")
print()
print("=== THIEU trong Logical cua ban (co trong he thong) ===")
for t in missing:
    print(f"  - {mermaid_norm[t]}")
print()
print("=== Chi co trong Logical cua ban (khong nam Mermaid day du) ===")
for t in extra:
    print(f"  + {user_norm[t]}")
print()
print("=== Bang trong Logical cua ban ===")
for t in sorted(user_tables, key=str.lower):
    mark = "OK" if t.lower() in mermaid_norm else "EXTRA"
    print(f"  [{mark}] {t}")
