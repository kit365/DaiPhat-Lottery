# -*- coding: utf-8 -*-
import html
import re
import sys
from xml.etree import ElementTree as ET

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

root = ET.parse(r"C:\Users\phuja\Downloads\logical_final (1).drawio").getroot()

tables = []
for el in root.iter("UserObject"):
    label = el.get("label") or ""
    oid = el.get("id")
    cell = el.find("mxCell")
    style = (cell.get("style") if cell is not None else "") or ""
    clean = re.sub(r"<[^>]+>", "", html.unescape(label)).replace("\u2800", "").strip()
    # table containers
    is_table = "shape=table" in style and "tableRow" not in style
    is_row = "tableRow" in style
    tables.append({
        "id": oid,
        "label": clean[:80],
        "is_table": is_table,
        "is_row": is_row,
        "style0": style.split(";")[0] if style else "",
        "attrs": {k: v for k, v in el.attrib.items() if k not in ("label", "id", "placeholders")},
    })

print("UserObject total", len(tables))
print("is_table", sum(1 for t in tables if t["is_table"]))
print("is_row", sum(1 for t in tables if t["is_row"]))
print("--- table labels ---")
for t in tables:
    if t["is_table"]:
        print(repr(t["label"]), t["attrs"])
print("--- sample non-table UserObjects ---")
for t in tables[:20]:
    if not t["is_table"]:
        print(t["style0"], repr(t["label"]), t["attrs"])
