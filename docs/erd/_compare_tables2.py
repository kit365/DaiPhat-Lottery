# -*- coding: utf-8 -*-
import base64
import html
import re
import zlib
from pathlib import Path
from urllib.parse import unquote
from xml.etree import ElementTree as ET

DRAWIO = Path(r"C:\Users\phuja\Downloads\logical_final (1).drawio")
MERMAID = Path(r"c:\DaiPhat_Clone\docs\erd\DaiPhatLottery_ERD-logical-corrected.md")

text = DRAWIO.read_text(encoding="utf-8")
print("file_starts", text[:200].replace("\n", " "))
print("has_compressed", "compressed=" in text[:800])
print("diagram_count", text.count("<diagram"))

# try uncompressed first
if "<mxCell" in text and "swimlane" in text:
    root = ET.fromstring(text)
else:
    m = re.search(r"<diagram[^>]*>(.*?)</diagram>", text, re.S)
    raw = m.group(1).strip()
    if raw.startswith("<"):
        root = ET.fromstring(text)
    else:
        data = base64.b64decode(raw)
        xml = unquote(zlib.decompress(data, -15).decode("utf-8"))
        root = ET.fromstring(xml)

# Collect swimlane / table parent values
tables = []
for cell in root.iter("mxCell"):
    if cell.get("vertex") != "1":
        continue
    style = cell.get("style") or ""
    val = cell.get("value") or ""
    if "swimlane" in style or "shape=table" in style:
        clean = html.unescape(val)
        clean = re.sub(r"<[^>]+>", "", clean).strip()
        clean = clean.split("\n")[0].strip()
        if clean:
            tables.append((cell.get("id"), clean, style[:50]))

print("SWIMLANE_COUNT", len(tables))
for t in tables[:60]:
    print("T", t[0], t[1])

# Also list unique parent ids that have many children with PK/FK rows
from collections import Counter
parent_counts = Counter()
parent_sample = {}
for cell in root.iter("mxCell"):
    if cell.get("vertex") != "1":
        continue
    parent = cell.get("parent")
    val = cell.get("value") or ""
    if "PK" in val or "FK" in val or "UK" in val or "BIGSERIAL" in val or "VARCHAR" in val:
        parent_counts[parent] += 1
        parent_sample.setdefault(parent, val[:80])

print("TOP_PARENTS", parent_counts.most_common(20))
