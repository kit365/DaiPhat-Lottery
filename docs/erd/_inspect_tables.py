# -*- coding: utf-8 -*-
import html
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

root = ET.parse(r"C:\Users\phuja\Downloads\logical_final (1).drawio").getroot()

# Build id -> cell
cells = {c.get("id"): c for c in root.iter("mxCell") if c.get("id")}

tables = []
for cell in root.iter("mxCell"):
    if cell.get("vertex") != "1":
        continue
    style = cell.get("style") or ""
    # exact table container: shape=table but not tableRow
    if not re.search(r"(?:^|;|-)shape=table(?:;|$)", style):
        continue
    if "tableRow" in style:
        continue
    cid = cell.get("id")
    val = cell.get("value") or ""
    clean = re.sub(r"<[^>]+>", "", html.unescape(val)).replace("\u2800", "").strip()
    # children that might hold title
    child_vals = []
    for c in root.iter("mxCell"):
        if c.get("parent") == cid and c.get("vertex") == "1":
            cv = c.get("value") or ""
            cclean = re.sub(r"<[^>]+>", "", html.unescape(cv)).replace("\u2800", "").strip()
            cs = c.get("style") or ""
            child_vals.append((c.get("id"), cclean[:60], cs[:40]))
    tables.append((cid, clean[:80], child_vals[:5]))

print("TABLE_CONTAINERS", len(tables))
for t in tables[:15]:
    print("ID", t[0], "VAL", repr(t[1]))
    for ch in t[2]:
        print("  child", ch)
