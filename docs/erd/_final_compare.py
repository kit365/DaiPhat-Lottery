# -*- coding: utf-8 -*-
import html
import re
import sys
from xml.etree import ElementTree as ET
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

root = ET.parse(r"C:\Users\phuja\Downloads\logical_final (1).drawio").getroot()
user = set()
for el in root.iter("UserObject"):
    cell = el.find("mxCell")
    style = (cell.get("style") if cell is not None else "") or ""
    if "shape=table" in style and "tableRow" not in style:
        label = el.get("label") or el.get("mermaidBaseValue") or ""
        clean = re.sub(r"<[^>]+>", "", html.unescape(label)).replace("\u2800", "").strip()
        if clean:
            user.add(clean)

text = Path(r"c:\DaiPhat_Clone\docs\erd\DaiPhatLottery_ERD-logical-corrected.md").read_text(encoding="utf-8")
body = re.search(r"```mermaid\n(.*?)\n```", text, re.S).group(1)
full = set(re.findall(r"^\s{2}(\w+)\s*\{", body, re.M))

missing = sorted(full - user)
extra = sorted(user - full)

# Domain grouping for missing
domains = {
    "Prize claim / payout": [
        "prize_claim_submissions",
        "prize_claim_submission_lines",
        "prize_payout_installments",
    ],
    "Contracts / lucky": ["contracts", "lucky_pattern_configs"],
    "Other": [],
}
print(f"Logical ban gui: {len(user)} bang")
print(f"Logical day du (he thong): {len(full)} bang")
print(f"Thieu: {len(missing)} | Thua/khac ten: {len(extra)}")
print()
print("=== BAN DANG THIEU (co trong he thong / Mermaid day du) ===")
for t in missing:
    print(f"  - {t}")
print()
if extra:
    print("=== CHI CO TRONG BAN CUA BAN ===")
    for t in extra:
        print(f"  + {t}")

# Also check Flyway for tables beyond both
schema = Path(r"c:\DaiPhat_Clone\daiphat-be\core-api\src\main\resources\db")
flyway = set()
for p in schema.rglob("*.sql"):
    for m in re.finditer(r"CREATE TABLE(?: IF NOT EXISTS)?\s+([a-zA-Z0-9_]+)", p.read_text(encoding="utf-8", errors="ignore"), re.I):
        flyway.add(m.group(1).lower())

# exclude flyway schema history etc
skip = {"flyway_schema_history", "shedlock"}
flyway -= skip
missing_vs_flyway = sorted(flyway - {t.lower() for t in user})
print()
print(f"Flyway CREATE TABLE: {len(flyway)}")
print(f"Thieu so voi Flyway (chua co tren Logical ban gui): {len(missing_vs_flyway)}")
for t in missing_vs_flyway:
    in_mermaid = " (da co Mermaid)" if t in full else " (chua co Mermaid)"
    print(f"  - {t}{in_mermaid}")
