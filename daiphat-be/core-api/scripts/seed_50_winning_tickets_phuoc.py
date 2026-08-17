#!/usr/bin/env python3
"""
Seed 50 winning tickets for phuocnhse180743@fpt.edu.vn across past draw days.

- Creates import_batches + import_batch_lines (production-like) under Minh Chính
- Upserts COMPLETED lottery_results + details per (station, draw_date)
- Crafts ticket numbers so TicketPrizeMatcher hits the intended prize
- Spreads winners across multiple COMPLETED orders owned by the target user
- Each southern prize level gets at least 3 winners (50 total, as even as possible)

Applies via docker exec psql (not committed as Flyway).
"""

from __future__ import annotations

import hashlib
import subprocess
import uuid
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ENV_PATH = ROOT / ".env"
MARKER = "WIN50_SEED"
CUSTOMER_EMAIL = "phuocnhse180743@fpt.edu.vn"
SUPPLIER_CODE = "MINHCHINH"
PRICE = 10_000
IMPORT_COST = 9_500
ORDER_PREFIX = "ORD-WIN50-"
BATCH_PREFIX = "WIN50-"

PRIZE_ORDER = ["DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "DB_PHU", "KK"]

# Even spread of 50 across 11 prizes, min 3 each → 5×6 + 4×5 = 50
WIN_COUNTS = {
    "DB": 5, "G1": 5, "G2": 5, "G3": 5, "G4": 5, "G5": 5,
    "G6": 4, "G7": 4, "G8": 4, "DB_PHU": 4, "KK": 4,
}

# Online claim: order ONLINE + serial PROXY_HOLDING/EXPIRED + prize ≤ 10M.
# G3=10M is at the cap; DB/G1/G2/DB_PHU exceed it → in-person only.
ONLINE_CLAIM_PRIZES = {"G3", "G4", "G5", "G6", "G7", "G8", "KK"}

# station_id → (code, draw weekdays as ISO 1=Mon..7=Sun)
STATION_CATALOG: dict[int, tuple[str, set[int]]] = {
    1: ("HCM", {1, 6}),
    2: ("DT", {1}),
    3: ("CM", {1}),
    4: ("BT", {2}),
    5: ("VT", {2}),
    6: ("BL", {2}),
    7: ("DN", {3}),
    8: ("CT", {3}),
    9: ("ST", {3}),
    10: ("TN", {4}),
    11: ("AG", {4}),
    12: ("BT2", {4}),
    13: ("VL", {5}),
    14: ("BD", {5}),
    15: ("TV", {5}),
    16: ("LA", {6}),
    17: ("BP", {6}),
    18: ("HG", {6}),
    19: ("TG", {7}),
    20: ("KG", {7}),
    21: ("DL", {7}),
}

VN = timezone(timedelta(hours=7))


def load_env() -> dict[str, str]:
    out: dict[str, str] = {}
    if not ENV_PATH.exists():
        return out
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def sql_str(value: object) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def docker_psql(env: dict[str, str], sql: str) -> str:
    password = env.get("CORE_POSTGRES_PASSWORD", "12345")
    user = env.get("CORE_POSTGRES_USER", "sa")
    db = env.get("CORE_POSTGRES_DB", "daiphat_core_db")
    result = subprocess.run(
        [
            "docker", "exec", "-e", f"PGPASSWORD={password}",
            "daiphat-postgres", "psql", "-U", user, "-d", db, "-t", "-A", "-c", sql,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def pad_win(code: str, w: str) -> str:
    if code in ("G5", "G6"):
        return w.zfill(4)[-4:]
    if code == "G7":
        return w.zfill(3)[-3:]
    if code == "G8":
        return w.zfill(2)[-2:]
    return w.zfill(6)[-6:]


def matches(ticket: str, win: str, prize: str) -> bool:
    if prize == "DB":
        return ticket == win
    if prize == "DB_PHU":
        return (
            len(ticket) == len(win)
            and len(win) >= 2
            and ticket[0] != win[0]
            and ticket[1:] == win[1:]
        )
    if prize == "KK":
        if len(ticket) != len(win) or len(win) < 2 or ticket[0] != win[0]:
            return False
        return sum(1 for i in range(1, len(win)) if ticket[i] != win[i]) == 1
    digits = {"G1": 5, "G2": 5, "G3": 5, "G4": 5, "G5": 4, "G6": 4, "G7": 3, "G8": 2}[prize]
    return ticket[-digits:] == pad_win(prize, win)[-digits:]


def first_prize(ticket: str, results: dict[str, str]) -> str | None:
    for prize in PRIZE_ORDER:
        win = results["DB"] if prize in ("DB_PHU", "KK") else results[prize]
        if matches(ticket, win, prize):
            return prize
    return None


def craft_ticket(prize: str, win_num: str, variant: int) -> str:
    w = win_num
    if prize == "DB":
        return w
    if prize == "DB_PHU":
        first = str((int(w[0]) + 1 + variant) % 10)
        if first == w[0]:
            first = str((int(w[0]) + 3) % 10)
        return first + w[1:]
    if prize == "KK":
        chars = list(w)
        pos = 1 + (variant % 5)
        old = int(chars[pos])
        chars[pos] = str((old + 1 + variant) % 10)
        if chars[pos] == w[pos]:
            chars[pos] = str((old + 3) % 10)
        return "".join(chars)
    digits = {"G1": 5, "G2": 5, "G3": 5, "G4": 5, "G5": 4, "G6": 4, "G7": 3, "G8": 2}[prize]
    tail = pad_win(prize, w)[-digits:]
    pref_len = 6 - digits
    salt = variant * 97 + 17
    if pref_len == 0:
        return tail
    return f"{(salt % (10 ** pref_len)):0{pref_len}d}{tail}"


def make_serial(station_code: str, draw: date, numbers: str, idx: int) -> str:
    compact = draw.strftime("%y%m%d")
    digest = hashlib.md5(f"{station_code}:{draw}:{numbers}:{idx}".encode()).hexdigest()[:5]
    raw = f"w50{compact}{station_code.lower()}{idx:02d}{digest}".lower()
    return "".join(ch for ch in raw if ch.isalnum())


def digit_block(seed: str, length: int, salt: int) -> str:
    h = hashlib.sha256(f"{seed}:{salt}".encode()).hexdigest()
    n = int(h[:12], 16) % (10 ** length)
    return f"{n:0{length}d}"


def build_results(station_id: int, draw: date) -> dict[str, str]:
    """Craft result numbers that minimize accidental cross-prize collisions."""
    seed = f"{station_id}:{draw.isoformat()}"
    db = digit_block(seed, 6, 1)
    # Force DB not to end with patterns reused by short prizes poorly — regenerate G* from separate salts.
    g1 = digit_block(seed, 6, 11)[-5:]
    g2 = digit_block(seed, 6, 12)[-5:]
    g3 = digit_block(seed, 6, 13)[-5:]
    g4 = digit_block(seed, 6, 14)[-5:]
    g5 = digit_block(seed, 6, 15)[-4:]
    g6 = digit_block(seed, 6, 16)[-4:]
    g7 = digit_block(seed, 6, 17)[-3:]
    g8 = digit_block(seed, 6, 18)[-2:]

    # Ensure G1-G4 tails != DB last 5, G5-G6 != DB last 4, etc.
    def nudge(tail: str, forbidden: str) -> str:
        if tail != forbidden:
            return tail
        chars = list(tail)
        chars[-1] = str((int(chars[-1]) + 1) % 10)
        return "".join(chars)

    g1 = nudge(g1, db[-5:])
    g2 = nudge(g2, db[-5:])
    g3 = nudge(g3, db[-5:])
    g4 = nudge(g4, db[-5:])
    g5 = nudge(g5, db[-4:])
    g6 = nudge(g6, db[-4:])
    g7 = nudge(g7, db[-3:])
    g8 = nudge(g8, db[-2:])

    # Store full 6-digit style for G1-G4 (matcher uses last N)
    return {
        "DB": db,
        "G1": digit_block(seed, 1, 21) + g1,
        "G2": digit_block(seed, 1, 22) + g2,
        "G3": digit_block(seed, 1, 23) + g3,
        "G4": digit_block(seed, 1, 24) + g4,
        "G5": g5,
        "G6": g6,
        "G7": g7,
        "G8": g8,
    }


def stations_for(draw: date) -> list[tuple[int, str]]:
    iso = draw.isoweekday()
    return [(sid, code) for sid, (code, days) in STATION_CATALOG.items() if iso in days]


def past_draw_dates(today: date, days: int = 5) -> list[date]:
    """Last N calendar days strictly before today (past only)."""
    return [today - timedelta(days=i) for i in range(days, 0, -1)]


def build_winners(draw_dates: list[date]) -> list[dict]:
    assert sum(WIN_COUNTS.values()) == 50
    assert all(c >= 3 for c in WIN_COUNTS.values())

    # Precompute results per (station, draw)
    results_map: dict[tuple[int, date], dict[str, str]] = {}
    day_stations: dict[date, list[tuple[int, str]]] = {}
    for d in draw_dates:
        sts = stations_for(d)
        if not sts:
            raise RuntimeError(f"No stations for {d}")
        day_stations[d] = sts
        for sid, _ in sts:
            results_map[(sid, d)] = build_results(sid, d)

    used: set[tuple[int, date, str]] = set()
    winners: list[dict] = []
    day_i = 0

    for prize in PRIZE_ORDER:
        for variant in range(WIN_COUNTS[prize]):
            placed = False
            for attempt in range(400):
                d = draw_dates[(day_i + attempt) % len(draw_dates)]
                sts = day_stations[d]
                sid, code = sts[(variant + attempt) % len(sts)]
                results = results_map[(sid, d)]
                if prize == "DB":
                    # One DB per station/day max
                    candidate = results["DB"]
                    if any(w["prize"] == "DB" and w["station_id"] == sid and w["draw_date"] == d for w in winners):
                        continue
                else:
                    base = results["DB"] if prize in ("DB_PHU", "KK") else results[prize]
                    candidate = craft_ticket(prize, base, variant * 11 + attempt * 7 + day_i)
                if first_prize(candidate, results) != prize:
                    continue
                key = (sid, d, candidate)
                if key in used:
                    continue
                used.add(key)
                winners.append({
                    "station_id": sid,
                    "station_code": code,
                    "draw_date": d,
                    "numbers": candidate,
                    "prize": prize,
                    "serial": make_serial(code, d, candidate, len(winners)),
                    "results": results,
                })
                placed = True
                day_i += 1
                break
            if not placed:
                raise RuntimeError(f"Could not place winner {prize} variant={variant}")

    assert len(winners) == 50
    counts = Counter(w["prize"] for w in winners)
    assert all(counts[p] >= 3 for p in PRIZE_ORDER), counts
    for w in winners:
        assert first_prize(w["numbers"], w["results"]) == w["prize"]
    return winners


def chunk_orders(winners: list[dict], order_count: int = 10) -> list[dict]:
    chunks: list[list[dict]] = [[] for _ in range(order_count)]
    for i, w in enumerate(winners):
        chunks[i % order_count].append(w)
    orders = []
    for oi, items in enumerate(chunks):
        if not items:
            continue
        orders.append({
            "id": str(uuid.uuid4()),
            "code": f"{ORDER_PREFIX}{oi + 1:03d}",
            "items": items,
        })
    return orders


def generate_sql(
    winners: list[dict],
    orders: list[dict],
    prize_ids: dict[str, int],
    customer_id: str,
    actor_id: str,
    supplier_id: int,
) -> str:
    lines: list[str] = []
    L = lines.append
    L(f"-- {MARKER}: 50 winning tickets for {CUSTOMER_EMAIL}")
    L("BEGIN;")
    L("")

    # Cleanup previous seed
    L(f"""
-- Cleanup previous {MARKER} rows (orders first)
DELETE FROM order_details od
USING orders o
WHERE od.order_id = o.id AND o.order_code LIKE '{ORDER_PREFIX}%';

DELETE FROM transactions t
USING orders o
WHERE t.order_id = o.id AND o.order_code LIKE '{ORDER_PREFIX}%';

DELETE FROM orders WHERE order_code LIKE '{ORDER_PREFIX}%';

DELETE FROM lottery_ticket_serials WHERE created_by = '{MARKER}';
DELETE FROM lottery_tickets WHERE created_by = '{MARKER}';
DELETE FROM import_batch_lines WHERE created_by = '{MARKER}';
UPDATE import_batches SET supplier_settlement_id = NULL
WHERE created_by = '{MARKER}' OR batch_code LIKE '{BATCH_PREFIX}%';
DELETE FROM import_batches WHERE created_by = '{MARKER}' OR batch_code LIKE '{BATCH_PREFIX}%';
UPDATE return_batches SET supplier_settlement_id = NULL
WHERE created_by = '{MARKER}';
DELETE FROM return_batch_lines rbl
USING return_batches rb
WHERE rbl.return_batch_id = rb.id AND rb.created_by = '{MARKER}';
DELETE FROM return_batches WHERE created_by = '{MARKER}';
DELETE FROM supplier_settlements
WHERE created_by = '{MARKER}' OR supplier_settlement_code LIKE 'SS-WIN50-%';
""")

    # Group winners by draw_date / station
    by_day: dict[date, list[dict]] = defaultdict(list)
    for w in winners:
        by_day[w["draw_date"]].append(w)

    for draw, day_winners in sorted(by_day.items()):
        compact = draw.strftime("%Y%m%d")
        stations = sorted({(w["station_id"], w["station_code"]) for w in day_winners})
        by_station: dict[int, list[dict]] = defaultdict(list)
        for w in day_winners:
            by_station[w["station_id"]].append(w)

        # Settlement: reuse existing (supplier, draw_date) when present (e.g. Minh Chính demo)
        ss_code = f"SS-WIN50-{compact}"
        L(
            f"""
INSERT INTO supplier_settlements (
  lottery_supplier_id, period_from, period_to, supplier_settlement_code,
  total_import_value, total_return_value, total_paid_amount, remaining_amount,
  status, reconciliation_phase, is_return_expired, expired_return_value,
  original_ticket_unit_price, reconciled_ticket_unit_price,
  discrepancy_types, discrepancy_items, payment_evidence_urls,
  station_commission_snapshots,
  created_at, updated_at, created_by, last_modified_by
) VALUES (
  {supplier_id}, DATE '{draw}', DATE '{draw}', {sql_str(ss_code)},
  0, 0, 0, 0,
  'CLOSED', 'COMPLETED', TRUE, 0,
  {IMPORT_COST}, {IMPORT_COST},
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '[]'::jsonb,
  NOW(), NOW(), '{MARKER}', '{MARKER}'
)
ON CONFLICT ON CONSTRAINT uq_supplier_settlements_supplier_period_from DO NOTHING;
"""
        )

        batch_code = f"{BATCH_PREFIX}{compact}"
        total_qty = len(day_winners)
        total_cost = total_qty * IMPORT_COST
        imported_at = f"TIMESTAMP '{draw} 09:00:00'"
        L(
            f"""
INSERT INTO import_batches (
  batch_code, draw_date, supplier_id, supplier_settlement_id, import_mode,
  invoice_evidence_url, ticket_list_image_urls,
  imported_by, imported_at, status,
  line_count, total_declare_quantity, total_declared_cost_value,
  total_imported_quantity, total_imported_cost_value,
  submitted_at, completed_at, note,
  created_at, updated_at, created_by, last_modified_by
) VALUES (
  {sql_str(batch_code)}, DATE '{draw}', {supplier_id},
  (SELECT id FROM supplier_settlements
    WHERE lottery_supplier_id = {supplier_id} AND period_from = DATE '{draw}' AND deleted_at IS NULL),
  'IN_DAY',
  'https://seed.local/win50/invoice.png',
  '["https://seed.local/win50/ticket-list.png"]'::jsonb,
  '{actor_id}'::uuid, {imported_at}, 'IMPORTED',
  {len(stations)}, {total_qty}, {total_cost},
  {total_qty}, {total_cost},
  {imported_at}, {imported_at} + INTERVAL '30 minutes',
  'WIN50 import batch',
  NOW(), NOW(), '{MARKER}', '{MARKER}'
);
"""
        )

        for sid, scode in stations:
            items = by_station[sid]
            qty = len(items)
            line_code = f"LO-WIN50-{compact}-{scode}-NEW"
            line_cost = qty * IMPORT_COST
            results = items[0]["results"]

            # Upsert lottery result COMPLETED
            L(
                f"""
INSERT INTO lottery_results (
  station_id, draw_date, source, is_official, status, published_at,
  created_at, updated_at, created_by, last_modified_by
) VALUES (
  {sid}, DATE '{draw}', 'MANUAL', TRUE, 'COMPLETED',
  TIMESTAMP '{draw} 16:35:00',
  NOW(), NOW(), '{MARKER}', '{MARKER}'
)
ON CONFLICT (station_id, draw_date) DO UPDATE SET
  status = 'COMPLETED',
  is_official = TRUE,
  published_at = EXCLUDED.published_at,
  deleted_at = NULL,
  updated_at = NOW(),
  last_modified_by = '{MARKER}';

DELETE FROM lottery_result_details d
USING lottery_results r
WHERE d.lottery_result_id = r.id
  AND r.station_id = {sid}
  AND r.draw_date = DATE '{draw}'
  AND r.deleted_at IS NULL;
"""
            )
            for code in ["DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"]:
                wn = pad_win(code, results[code])
                L(
                    "INSERT INTO lottery_result_details "
                    "(lottery_result_id, prize_structure_id, winning_number, created_by, last_modified_by)\n"
                    f"SELECT r.id, {prize_ids[code]}, {sql_str(wn)}, '{MARKER}', '{MARKER}'\n"
                    f"FROM lottery_results r WHERE r.station_id = {sid} AND r.draw_date = DATE '{draw}' "
                    f"AND r.deleted_at IS NULL;"
                )
            db = results["DB"]
            for code in ("DB_PHU", "KK"):
                L(
                    "INSERT INTO lottery_result_details "
                    "(lottery_result_id, prize_structure_id, winning_number, created_by, last_modified_by)\n"
                    f"SELECT r.id, {prize_ids[code]}, {sql_str(db)}, '{MARKER}', '{MARKER}'\n"
                    f"FROM lottery_results r WHERE r.station_id = {sid} AND r.draw_date = DATE '{draw}' "
                    f"AND r.deleted_at IS NULL;"
                )

            L(
                f"""
INSERT INTO import_batch_lines (
  import_batch_id, lottery_station_id, batch_type, batch_code,
  declare_quantity, declared_cost_value, total_quantity,
  import_cost, total_cost_value, status, imported_at,
  created_at, updated_at, created_by, last_modified_by
) VALUES (
  (SELECT id FROM import_batches WHERE batch_code = {sql_str(batch_code)}),
  {sid}, 'NEW', {sql_str(line_code)},
  {qty}, {line_cost}, {qty},
  {IMPORT_COST}, {line_cost}, 'IMPORTED', {imported_at} + INTERVAL '30 minutes',
  NOW(), NOW(), '{MARKER}', '{MARKER}'
);
"""
            )

            for w in items:
                serial_status = "PROXY_HOLDING" if w["prize"] in ONLINE_CLAIM_PRIZES else "SOLD"
                L(
                    f"""
INSERT INTO lottery_tickets (
  station_id, numbers, draw_date, price_snapshot, status, is_active, batch_code,
  created_at, updated_at, created_by, last_modified_by
) VALUES (
  {sid}, {sql_str(w['numbers'])}, DATE '{draw}', {PRICE}, 'SOLD_OUT', FALSE,
  {sql_str(line_code)},
  {imported_at}, NOW(), '{MARKER}', '{MARKER}'
);

INSERT INTO lottery_ticket_serials (
  ticket_id, import_batch_id, import_batch_line_id,
  serial_number, status, ticket_condition, payout_state, input_source,
  station_id, draw_date, imported_by, imported_at, is_verified,
  created_at, updated_at, created_by, last_modified_by
) VALUES (
  (SELECT id FROM lottery_tickets WHERE station_id = {sid} AND numbers = {sql_str(w['numbers'])}
     AND draw_date = DATE '{draw}' AND deleted_at IS NULL ORDER BY id DESC LIMIT 1),
  (SELECT id FROM import_batches WHERE batch_code = {sql_str(batch_code)}),
  (SELECT id FROM import_batch_lines WHERE batch_code = {sql_str(line_code)}),
  {sql_str(w['serial'])}, '{serial_status}', 'GOOD', 'NONE', 'MANUAL',
  {sid}, DATE '{draw}', '{actor_id}'::uuid, {imported_at}, TRUE,
  NOW(), NOW(), '{MARKER}', '{MARKER}'
);
"""
                )

        # Only bump totals on WIN50-owned settlement rows (skip shared Minh Chính settlements)
        L(
            f"""
UPDATE supplier_settlements SET
  total_import_value = COALESCE(total_import_value, 0) + {total_cost},
  system_import_quantity = COALESCE(system_import_quantity, 0) + {total_qty},
  system_import_value = COALESCE(system_import_value, 0) + {total_cost},
  updated_at = NOW()
WHERE supplier_settlement_code = {sql_str(ss_code)}
  AND created_by = '{MARKER}';
"""
        )

    # Orders for target user
    for oi, order in enumerate(orders):
        items = order["items"]
        total = len(items) * PRICE
        # Use earliest draw among items for timestamps
        min_draw = min(i["draw_date"] for i in items)
        paid_at = f"TIMESTAMP '{min_draw} 10:20:00' + make_interval(mins => {oi * 11})"
        pickup_at = f"TIMESTAMP '{min_draw} 17:40:00' + make_interval(mins => {oi * 7})"
        L(
            f"""
INSERT INTO orders (
  id, user_id, name, phone, email, order_code, order_type, receive_type, total_amount, status,
  expected_pickup_at, actual_picked_up_at, picked_up_by,
  created_at, updated_at, created_by, last_modified_by
) VALUES (
  '{order['id']}'::uuid,
  '{customer_id}'::uuid,
  'Phuoc Nguyen',
  COALESCE((SELECT phone FROM users WHERE id = '{customer_id}'::uuid), '0900000000'),
  {sql_str(CUSTOMER_EMAIL)},
  {sql_str(order['code'])},
  'ONLINE', 'COUNTER_PICKUP', {total}, 'COMPLETED',
  {paid_at} + INTERVAL '6 hours',
  {pickup_at},
  '{actor_id}'::uuid,
  {paid_at}, NOW(), '{MARKER}', '{MARKER}'
);

INSERT INTO transactions (
  order_id, amount, gateway, status, paid_at, type,
  created_at, updated_at, created_by, last_modified_by
) VALUES (
  '{order['id']}'::uuid, {total}, 'PAYOS', 'COMPLETED', {paid_at}, 'ONLINE',
  {paid_at}, NOW(), '{MARKER}', '{MARKER}'
);
"""
        )
        for item in items:
            L(
                f"""
INSERT INTO order_details (
  order_id, lottery_ticket_id, lottery_ticket_serial_id, quantity, price, status,
  handed_over_at, handed_over_by,
  created_at, updated_at, created_by, last_modified_by
)
SELECT '{order['id']}'::uuid, lt.id, lts.id, 1, {PRICE}, 'ACTIVE',
  {pickup_at}, '{actor_id}'::uuid,
  {paid_at}, NOW(), '{MARKER}', '{MARKER}'
FROM lottery_tickets lt
JOIN lottery_ticket_serials lts
  ON lts.ticket_id = lt.id AND lts.deleted_at IS NULL
WHERE lt.created_by = '{MARKER}'
  AND lt.station_id = {item['station_id']}
  AND lt.numbers = {sql_str(item['numbers'])}
  AND lt.draw_date = DATE '{item['draw_date']}'
  AND lts.serial_number = {sql_str(item['serial'])}
  AND lt.deleted_at IS NULL;
"""
            )

    L("COMMIT;")
    return "\n".join(lines) + "\n"


def apply_sql(sql: str, env: dict[str, str]) -> None:
    password = env.get("CORE_POSTGRES_PASSWORD", "12345")
    user = env.get("CORE_POSTGRES_USER", "sa")
    db = env.get("CORE_POSTGRES_DB", "daiphat_core_db")
    tmp = Path("/tmp/seed_win50_phuoc.sql")
    tmp.write_text(sql, encoding="utf-8")
    subprocess.run(
        ["docker", "cp", str(tmp), "daiphat-postgres:/tmp/seed_win50_phuoc.sql"],
        check=True,
    )
    result = subprocess.run(
        [
            "docker", "exec", "-e", f"PGPASSWORD={password}",
            "daiphat-postgres", "psql", "-U", user, "-d", db,
            "-v", "ON_ERROR_STOP=1", "-f", "/tmp/seed_win50_phuoc.sql",
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout[-4000:])
    if result.returncode != 0:
        print(result.stderr[-6000:] if result.stderr else "")
        raise SystemExit(f"psql failed with code {result.returncode}")


def verify(env: dict[str, str], customer_id: str) -> None:
    sql = f"""
SELECT 'tickets' AS k, COUNT(*)::text FROM lottery_tickets WHERE created_by = '{MARKER}' AND deleted_at IS NULL
UNION ALL SELECT 'serials', COUNT(*)::text FROM lottery_ticket_serials WHERE created_by = '{MARKER}' AND deleted_at IS NULL
UNION ALL SELECT 'import_batches', COUNT(*)::text FROM import_batches WHERE created_by = '{MARKER}' AND deleted_at IS NULL
UNION ALL SELECT 'orders', COUNT(*)::text FROM orders WHERE order_code LIKE '{ORDER_PREFIX}%'
UNION ALL SELECT 'order_details', COUNT(*)::text FROM order_details od
  JOIN orders o ON o.id = od.order_id WHERE o.order_code LIKE '{ORDER_PREFIX}%'
UNION ALL SELECT 'owned_by_phuoc', COUNT(*)::text FROM order_details od
  JOIN orders o ON o.id = od.order_id
  WHERE o.user_id = '{customer_id}'::uuid AND o.order_code LIKE '{ORDER_PREFIX}%';
"""
    print(docker_psql(env, sql))
    print("prize distribution (from ticket numbers vs results — sample join):")
    print(
        docker_psql(
            env,
            f"""
SELECT lt.draw_date, COUNT(*) 
FROM lottery_tickets lt
WHERE lt.created_by = '{MARKER}' AND lt.deleted_at IS NULL
GROUP BY 1 ORDER BY 1;
""",
        )
    )


def main() -> None:
    assert sum(WIN_COUNTS.values()) == 50
    env = load_env()
    today = datetime.now(VN).date()
    draw_dates = past_draw_dates(today, days=5)
    print(f"today={today} past_days={draw_dates}")

    customer_id = docker_psql(
        env,
        f"SELECT id FROM users WHERE email = {sql_str(CUSTOMER_EMAIL)} AND deleted_at IS NULL LIMIT 1;",
    ).strip()
    if not customer_id:
        raise SystemExit(f"User not found: {CUSTOMER_EMAIL}")

    actor_id = docker_psql(
        env,
        "SELECT id FROM users WHERE deleted_at IS NULL ORDER BY created_at NULLS LAST, id LIMIT 1;",
    ).strip()
    supplier_id = int(
        docker_psql(
            env,
            f"SELECT id FROM lottery_suppliers WHERE code = {sql_str(SUPPLIER_CODE)} AND deleted_at IS NULL;",
        ).strip()
    )

    prize_rows = docker_psql(
        env,
        "SELECT prize_code || '=' || id FROM prize_structures WHERE deleted_at IS NULL;",
    )
    prize_ids: dict[str, int] = {}
    for line in prize_rows.splitlines():
        line = line.strip()
        if not line or "=" not in line:
            continue
        code, pid = line.split("=", 1)
        prize_ids[code] = int(pid)
    for code in PRIZE_ORDER:
        if code not in prize_ids:
            raise SystemExit(f"Missing prize_structure: {code}")

    winners = build_winners(draw_dates)
    print("prize counts:", dict(Counter(w["prize"] for w in winners)))
    print("day counts:", dict(Counter(w["draw_date"].isoformat() for w in winners)))
    print("station counts:", dict(Counter(w["station_code"] for w in winners)))

    orders = chunk_orders(winners, order_count=10)
    print("orders:", len(orders), "sizes:", [len(o["items"]) for o in orders])

    sql = generate_sql(
        winners, orders, prize_ids, customer_id, actor_id, supplier_id
    )
    apply_sql(sql, env)
    verify(env, customer_id)
    print("Done.")


if __name__ == "__main__":
    main()
