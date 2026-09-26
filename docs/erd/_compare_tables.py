# -*- coding: utf-8 -*-
"""Compare tables in user's Logical draw.io vs corrected Mermaid / Flyway extras."""
import base64
import html
import re
import zlib
from pathlib import Path
from urllib.parse import unquote
from xml.etree import ElementTree as ET

DRAWIO = Path(r"C:\Users\phuja\Downloads\logical_final (1).drawio")
MERMAID = Path(r"c:\DaiPhat_Clone\docs\erd\DaiPhatLottery_ERD-logical-corrected.md")


def decode_drawio(path: Path) -> ET.Element:
    text = path.read_text(encoding="utf-8")
    # uncompressed mxfile?
    if "<mxGraphModel" in text and "compressed" not in text[:500].lower():
        return ET.fromstring(text)
    m = re.search(r"<diagram[^>]*>(.*?)</diagram>", text, re.S)
    if not m:
        # maybe already uncompressed root
        return ET.fromstring(text)
    raw = m.group(1).strip()
    if raw.startswith("<"):
        return ET.fromstring(f"<root>{raw}</root>") if False else ET.fromstring(text)
    data = base64.b64decode(raw)
    xml = unquote(zlib.decompress(data, -15).decode("utf-8"))
    return ET.fromstring(xml)


def table_names_from_drawio(root: ET.Element) -> set[str]:
    names = set()
    for cell in root.iter("mxCell"):
        if cell.get("vertex") != "1":
            continue
        val = cell.get("value") or ""
        clean = html.unescape(val)
        clean = re.sub(r"<br\s*/?>", "\n", clean, flags=re.I)
        clean = re.sub(r"<[^>]+>", "", clean)
        # first non-empty line is usually table name
        lines = [ln.strip() for ln in clean.splitlines() if ln.strip()]
        if not lines:
            continue
        # ERD tables often have style swimlane or entity
        style = cell.get("style") or ""
        if "swimlane" not in style and "shape=table" not in style and "entity" not in style.lower():
            # still accept if first line looks like snake_case table
            if not re.match(r"^[a-z][a-z0-9_]*$", lines[0]):
                continue
        name = lines[0]
        # strip HTML entities leftovers / KEY header rows mistaken as name
        if name.upper() in {"PK", "FK", "UK", "KEY", "FIELD", "TYPE"}:
            continue
        if re.match(r"^[a-z][a-z0-9_]*$", name):
            names.add(name)
    return names


def table_names_from_mermaid(path: Path) -> set[str]:
    text = path.read_text(encoding="utf-8")
    body = re.search(r"```mermaid\n(.*?)\n```", text, re.S).group(1)
    return set(re.findall(r"^\s{2}(\w+)\s*\{", body, re.M))


root = decode_drawio(DRAWIO)
# If root is mxfile, dig into graph
if root.tag.endswith("mxfile") or root.tag == "mxfile":
    model = root.find(".//mxGraphModel")
    if model is not None:
        root = model

user_tables = table_names_from_drawio(root)
mermaid_tables = table_names_from_mermaid(MERMAID)

# Also try extracting from object labels that are table headers in draw.io sql/table shapes
# Print sample cells if empty
if len(user_tables) < 5:
    print("WARN few tables parsed:", sorted(user_tables))
    samples = []
    for cell in list(root.iter("mxCell"))[:80]:
        if cell.get("vertex") == "1" and cell.get("value"):
            v = re.sub(r"<[^>]+>", " ", html.unescape(cell.get("value")))[:80]
            samples.append((cell.get("style", "")[:40], v))
    for s in samples[:30]:
        print("SAMPLE", s)

missing_in_user = sorted(mermaid_tables - user_tables)
extra_in_user = sorted(user_tables - mermaid_tables)

print("USER_COUNT", len(user_tables))
print("MERMAID_COUNT", len(mermaid_tables))
print("MISSING_IN_USER", len(missing_in_user))
for t in missing_in_user:
    print("  -", t)
print("ONLY_IN_USER", len(extra_in_user))
for t in extra_in_user:
    print("  +", t)
print("USER_TABLES")
for t in sorted(user_tables):
    print(" ", t)
