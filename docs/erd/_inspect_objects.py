# -*- coding: utf-8 -*-
import html
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

root = ET.parse(r"C:\Users\phuja\Downloads\logical_final (1).drawio").getroot()

# Count tags
from collections import Counter
tags = Counter(el.tag for el in root.iter())
print("TAGS", tags.most_common(20))

# object with label
objs = []
for el in root.iter("object"):
    label = el.get("label") or el.get("value") or ""
    oid = el.get("id")
    cell = el.find("mxCell")
    style = cell.get("style") if cell is not None else ""
    if cell is not None and "shape=table" in (style or "") and "tableRow" not in (style or ""):
        clean = re.sub(r"<[^>]+>", "", html.unescape(label)).replace("\u2800", "").strip()
        objs.append((oid, clean, style[:50]))

print("OBJECT_TABLES", len(objs))
for o in objs:
    print(o[0], o[1])
