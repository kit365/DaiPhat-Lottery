#!/usr/bin/env python3
"""Generate TEMP Flyway SQL for 2026-08-18 demo tickets, apply via psql, then delete the SQL file."""

from __future__ import annotations

import subprocess
import uuid
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ENV_PATH = ROOT / ".env"
MIGRATION_DIR = ROOT / "daiphat-be/core-api/src/main/resources/db/migration"
SQL_PATH = MIGRATION_DIR / "V202608182359__temp_seed_demo_tickets_20260818.sql"

DRAW = "2026-08-18"
BATCH = "SEED-DEMO-20260818"
PRICE = 10000
MEMBER_ROLE = "a21271ed-c31b-4b0b-98f9-7035dbf4ee46"
ADMIN = "500626d0-1c21-43ae-88fd-db7184b2bf95"

STATIONS = [
    {"id": 4, "code": "BT", "result_id": 6},
    {"id": 5, "code": "VT", "result_id": 7},
    {"id": 6, "code": "BL", "result_id": 4},
]

# Chosen so lower prizes do not collide with DB suffixes (needed for DB_PHU/KK).
RESULTS = {
    4: {
        "DB": "582917", "G1": "139204", "G2": "746385", "G3": "901572", "G4": "264830",
        "G5": "1583", "G6": "6729", "G7": "418", "G8": "73",
    },
    5: {
        "DB": "316842", "G1": "507391", "G2": "824156", "G3": "693047", "G4": "152978",
        "G5": "4061", "G6": "9382", "G7": "567", "G8": "29",
    },
    6: {
        "DB": "749063", "G1": "285714", "G2": "630195", "G3": "417826", "G4": "958301",
        "G5": "2740", "G6": "8516", "G7": "392", "G8": "64",
    },
}

PS = {
    "DB": 1, "G1": 2, "G2": 3, "G3": 4, "G4": 5, "G5": 6, "G6": 7, "G7": 8, "G8": 9,
    "DB_PHU": 10, "KK": 11,
}
PRIZE_ORDER = ["DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "DB_PHU", "KK"]

WIN_PLAN = [
    ("DB", 3), ("G1", 3), ("G2", 3), ("G3", 3), ("G4", 3),
    ("G5", 5), ("G6", 6), ("G7", 7), ("G8", 9),
    ("DB_PHU", 4), ("KK", 4),
]

CUSTOMERS = [
    ("seed_minh", "minh.tran@example.com", "0903111001", "Minh", "Tran"),
    ("seed_lan", "lan.pham@example.com", "0903111002", "Lan", "Pham"),
    ("seed_hung", "hung.le@example.com", "0903111003", "Hung", "Le"),
    ("seed_mai", "mai.nguyen@example.com", "0903111004", "Mai", "Nguyen"),
    ("seed_tuan", "tuan.vo@example.com", "0903111005", "Tuan", "Vo"),
    ("seed_hoa", "hoa.dang@example.com", "0903111006", "Hoa", "Dang"),
    ("seed_duc", "duc.bui@example.com", "0903111007", "Duc", "Bui"),
    ("seed_thao", "thao.ho@example.com", "0903111008", "Thao", "Ho"),
]


def load_env() -> dict[str, str]:
    out: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def sql_str(value: object) -> str:
    return "'" + str(value).replace("'", "''") + "'"


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


def first_prize(ticket: str, station_id: int) -> str | None:
    r = RESULTS[station_id]
    for prize in PRIZE_ORDER:
        win = r["DB"] if prize in ("DB_PHU", "KK") else r[prize]
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
    # Spread prefixes widely (not only sequential tails).
    for attempt in range(200):
        salt = variant * 97 + attempt * 131 + 17
        if pref_len == 0:
            candidate = tail
        elif pref_len == 1:
            candidate = f"{(salt % 10)}{tail}"
        elif pref_len == 2:
            candidate = f"{(salt % 100):02d}{tail}"
        elif pref_len == 3:
            candidate = f"{(salt % 1000):03d}{tail}"
        else:
            candidate = f"{(salt % (10 ** pref_len)):0{pref_len}d}{tail}"
        return candidate
    raise RuntimeError(f"craft failed for {prize}")


def make_serial(station_code: str, numbers: str, copy_idx: int = 0) -> str:
    block = chr(ord("A") + (int(numbers[0]) + copy_idx * 3) % 26) + str((int(numbers[2:4]) + copy_idx) % 10)
    return f"{station_code}-{block}-{numbers}-{copy_idx + 1:02d}"


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


def load_existing_keys(env: dict[str, str]) -> set[tuple[int, str]]:
    out = docker_psql(
        env,
        "SELECT station_id || '|' || numbers FROM lottery_tickets "
        "WHERE draw_date = DATE '2026-08-18' AND deleted_at IS NULL;",
    )
    keys: set[tuple[int, str]] = set()
    for line in out.splitlines():
        line = line.strip()
        if not line or "|" not in line:
            continue
        sid, nums = line.split("|", 1)
        keys.add((int(sid), nums))
    return keys


def build_specs(existing: set[tuple[int, str]]) -> tuple[list[dict], list[dict]]:
    assert sum(c for _, c in WIN_PLAN) == 50

    used_global: set[tuple[int, str]] = set(existing)
    used_numbers_any: set[str] = {n for _, n in existing}

    def take(station_id: int, numbers: str) -> bool:
        key = (station_id, numbers)
        if key in used_global:
            return False
        used_global.add(key)
        used_numbers_any.add(numbers)
        return True

    # Spread 500 base numbers across prefixes AND suffixes (full 6-digit space).
    pool: list[str] = []
    seen_pool: set[str] = set()
    i = 0
    while len(pool) < 2500:
        # LCG over 000000..999999 so prefixes and suffixes both vary.
        raw = (i * 1103515245 + 12345) % 1_000_000
        n = f"{raw:06d}"
        # Extra scramble every few tickets: swap digit blocks
        if i % 4 == 1:
            n = n[3:] + n[:3]
        elif i % 4 == 2:
            n = n[2:4] + n[0:2] + n[4:6]
        elif i % 4 == 3:
            n = n[4:6] + n[2:4] + n[0:2]
        if n not in used_numbers_any and n not in seen_pool:
            seen_pool.add(n)
            pool.append(n)
        i += 1
        if i > 3_000_000:
            raise RuntimeError("failed to build ticket number pool")

    specs: list[dict] = []
    pool_i = 0
    for idx in range(500):
        st = STATIONS[idx % 3]
        while pool_i < len(pool):
            n = pool[pool_i]
            pool_i += 1
            if first_prize(n, st["id"]) is not None:
                continue
            if take(st["id"], n):
                specs.append({
                    "idx": idx,
                    "station_id": st["id"],
                    "station_code": st["code"],
                    "numbers": n,
                    "is_winner": False,
                    "prize": None,
                    "sold": False,
                })
                break
        else:
            raise RuntimeError("pool exhausted for non-winning tickets")

    # Win slot indices spread across 500 tickets
    win_indices: list[int] = []
    seen: set[int] = set()
    for i in range(50):
        wi = (i * 10 + (i % 3) * 3) % 500
        while wi in seen:
            wi = (wi + 17) % 500
        seen.add(wi)
        win_indices.append(wi)

    slot_i = 0
    for prize, count in WIN_PLAN:
        for variant in range(count):
            tidx = win_indices[slot_i]
            old = specs[tidx]
            # free old key
            used_global.discard((old["station_id"], old["numbers"]))

            placed = False
            for attempt in range(300):
                st = STATIONS[(slot_i + attempt) % 3]
                if prize == "DB":
                    # one DB per Tuesday station
                    st = STATIONS[variant % 3]
                    candidate = RESULTS[st["id"]]["DB"]
                else:
                    base = RESULTS[st["id"]]["DB"] if prize in ("DB_PHU", "KK") else RESULTS[st["id"]][prize]
                    candidate = craft_ticket(prize, base, variant * 11 + attempt * 7 + slot_i)
                if first_prize(candidate, st["id"]) != prize:
                    continue
                if (st["id"], candidate) in used_global:
                    continue
                used_global.add((st["id"], candidate))
                specs[tidx] = {
                    "idx": tidx,
                    "station_id": st["id"],
                    "station_code": st["code"],
                    "numbers": candidate,
                    "is_winner": True,
                    "prize": prize,
                    "sold": False,
                }
                placed = True
                break
            if not placed:
                raise RuntimeError(f"Could not place winner {prize} variant={variant}")
            slot_i += 1

    winners = [t for t in specs if t["is_winner"]]
    assert len(winners) == 50
    counts = Counter(t["prize"] for t in winners)
    assert all(counts[p] >= 3 for p, _ in WIN_PLAN), counts
    assert all(first_prize(t["numbers"], t["station_id"]) == t["prize"] for t in winners)

    non_winners = [t for t in specs if not t["is_winner"]]
    orders: list[dict] = []
    order_count = 16
    chunks: list[list[dict]] = [[] for _ in range(order_count)]
    for i, w in enumerate(winners):
        chunks[i % order_count].append(w)

    nw_i = 0
    for oi, chunk in enumerate(chunks):
        extra = 1 + (oi % 3)
        for _ in range(extra):
            if nw_i < len(non_winners):
                non_winners[nw_i]["sold"] = True
                chunk.append(non_winners[nw_i])
                nw_i += 1
        for it in chunk:
            it["sold"] = True
        orders.append({
            "id": str(uuid.uuid4()),
            "code": f"ORD-20260818-SEED{oi + 1:03d}",
            "customer_i": oi % len(CUSTOMERS),
            "items": chunk,
            "use_phuoc": oi % 5 == 0,
        })

    return specs, orders


def generate_sql(specs: list[dict], orders: list[dict]) -> str:
    lines: list[str] = []
    L = lines.append
    L("-- TEMP seed demo tickets/orders for draw 2026-08-18")
    L("-- Applied once then deleted from repo (do not commit).")
    L("BEGIN;")
    L("")

    for uname, email, phone, fn, ln in CUSTOMERS:
        L(
            "INSERT INTO users (id, role_id, username, email, phone, first_name, last_name, "
            "status, is_email_verified, agreed_to_terms, has_password, created_by, last_modified_by)\n"
            f"SELECT gen_random_uuid(), '{MEMBER_ROLE}'::uuid, {sql_str(uname)}, {sql_str(email)}, "
            f"{sql_str(phone)}, {sql_str(fn)}, {sql_str(ln)}, 'ACTIVE', true, true, false, 'SEED', 'SEED'\n"
            f"WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = {sql_str(uname)} "
            f"OR u.email = {sql_str(email)} OR u.phone = {sql_str(phone)});"
        )

    L("")
    for st in STATIONS:
        rid = st["result_id"]
        sid = st["id"]
        L(
            "UPDATE lottery_results SET status = 'COMPLETED', is_official = true, "
            "published_at = TIMESTAMP '2026-08-18 16:35:00', updated_at = NOW(), last_modified_by = 'SEED' "
            f"WHERE id = {rid};"
        )
        L(f"DELETE FROM lottery_result_details WHERE lottery_result_id = {rid};")
        for code in ["DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"]:
            wn = pad_win(code, RESULTS[sid][code])
            L(
                "INSERT INTO lottery_result_details "
                "(lottery_result_id, prize_structure_id, winning_number, created_by, last_modified_by) "
                f"VALUES ({rid}, {PS[code]}, {sql_str(wn)}, 'SEED', 'SEED');"
            )
        # DB_PHU / KK compare against special number
        db = RESULTS[sid]["DB"]
        L(
            "INSERT INTO lottery_result_details "
            "(lottery_result_id, prize_structure_id, winning_number, created_by, last_modified_by) "
            f"VALUES ({rid}, {PS['DB_PHU']}, {sql_str(db)}, 'SEED', 'SEED');"
        )
        L(
            "INSERT INTO lottery_result_details "
            "(lottery_result_id, prize_structure_id, winning_number, created_by, last_modified_by) "
            f"VALUES ({rid}, {PS['KK']}, {sql_str(db)}, 'SEED', 'SEED');"
        )

    L("")
    L("CREATE TEMP TABLE seed_tickets (")
    L("  idx int PRIMARY KEY,")
    L("  station_id bigint NOT NULL,")
    L("  numbers varchar(20) NOT NULL,")
    L("  is_winner boolean NOT NULL,")
    L("  prize varchar(20),")
    L("  sold boolean NOT NULL,")
    L("  serial_number varchar(100) NOT NULL")
    L(");")

    values = []
    for t in specs:
        serial = make_serial(t["station_code"], t["numbers"], 0)
        prize_sql = sql_str(t["prize"]) if t["prize"] else "NULL"
        values.append(
            f"({t['idx']},{t['station_id']},{sql_str(t['numbers'])},"
            f"{'TRUE' if t['is_winner'] else 'FALSE'},{prize_sql},"
            f"{'TRUE' if t['sold'] else 'FALSE'},{sql_str(serial)})"
        )
    for i in range(0, len(values), 100):
        chunk = ",\n".join(values[i:i + 100])
        L(
            "INSERT INTO seed_tickets "
            "(idx, station_id, numbers, is_winner, prize, sold, serial_number) VALUES\n"
            f"{chunk};"
        )

    L(
        f"""
DELETE FROM seed_tickets st
WHERE EXISTS (
  SELECT 1 FROM lottery_tickets lt
  WHERE lt.station_id = st.station_id
    AND lt.numbers = st.numbers
    AND lt.draw_date = DATE '{DRAW}'
    AND lt.deleted_at IS NULL
);

INSERT INTO lottery_tickets (
  station_id, numbers, draw_date, price_snapshot, status, is_active, batch_code,
  created_at, updated_at, created_by, last_modified_by
)
SELECT station_id, numbers, DATE '{DRAW}', {PRICE},
  CASE WHEN sold THEN 'SOLD_OUT' ELSE 'IN_STOCK' END,
  TRUE, {sql_str(BATCH)},
  TIMESTAMP '2026-08-17 09:00:00' + make_interval(mins => idx),
  NOW(), 'SEED', 'SEED'
FROM seed_tickets
ORDER BY idx;

INSERT INTO lottery_ticket_serials (
  ticket_id, serial_number, status, ticket_condition, payout_state, input_source,
  station_id, draw_date, imported_by, imported_at, is_verified,
  created_at, updated_at, created_by, last_modified_by
)
SELECT lt.id, st.serial_number,
  CASE WHEN st.sold THEN 'SOLD' ELSE 'IN_STOCK' END,
  'GOOD', 'NONE', 'MANUAL',
  st.station_id, DATE '{DRAW}', '{ADMIN}'::uuid,
  TIMESTAMP '2026-08-17 09:05:00' + make_interval(mins => st.idx),
  TRUE,
  TIMESTAMP '2026-08-17 09:05:00' + make_interval(mins => st.idx),
  NOW(), 'SEED', 'SEED'
FROM seed_tickets st
JOIN lottery_tickets lt
  ON lt.station_id = st.station_id
 AND lt.numbers = st.numbers
 AND lt.draw_date = DATE '{DRAW}'
 AND lt.batch_code = {sql_str(BATCH)}
 AND lt.deleted_at IS NULL;
"""
    )

    for oi, order in enumerate(orders):
        cust = CUSTOMERS[order["customer_i"]]
        uname, email, phone, fn, ln = cust
        full_name = f"{fn} {ln}"
        item_count = len(order["items"])
        total = item_count * PRICE
        user_expr = (
            "COALESCE((SELECT id FROM users WHERE username = 'phuoc' LIMIT 1), "
            f"(SELECT id FROM users WHERE username = {sql_str(uname)} LIMIT 1))"
            if order["use_phuoc"]
            else f"(SELECT id FROM users WHERE username = {sql_str(uname)} LIMIT 1)"
        )
        paid_at = f"TIMESTAMP '2026-08-17 10:15:00' + make_interval(mins => {oi * 7})"
        pickup_at = f"TIMESTAMP '2026-08-17 18:30:00' + make_interval(mins => {oi * 5})"
        L(
            f"""
INSERT INTO orders (
  id, user_id, name, phone, email, order_code, order_type, receive_type, total_amount, status,
  expected_pickup_at, actual_picked_up_at, picked_up_by,
  created_at, updated_at, created_by, last_modified_by
) VALUES (
  '{order['id']}'::uuid,
  {user_expr},
  {sql_str(full_name)},
  {sql_str(phone)},
  {sql_str(email)},
  {sql_str(order['code'])},
  'ONLINE', 'COUNTER_PICKUP', {total}, 'COMPLETED',
  {paid_at} + INTERVAL '6 hours',
  {pickup_at},
  '{ADMIN}'::uuid,
  {paid_at}, NOW(), 'SEED', 'SEED'
);
"""
        )
        L(
            f"""
INSERT INTO transactions (
  order_id, amount, gateway, status, paid_at, type, created_at, updated_at, created_by, last_modified_by
) VALUES (
  '{order['id']}'::uuid, {total}, 'PAYOS', 'COMPLETED', {paid_at}, 'ONLINE',
  {paid_at}, NOW(), 'SEED', 'SEED'
);
"""
        )
        for item in order["items"]:
            serial = make_serial(item["station_code"], item["numbers"], 0)
            L(
                f"""
INSERT INTO order_details (
  order_id, lottery_ticket_id, lottery_ticket_serial_id, quantity, price, status,
  handed_over_at, handed_over_by, created_at, updated_at, created_by, last_modified_by
)
SELECT '{order['id']}'::uuid, lt.id, lts.id, 1, {PRICE}, 'HANDED_OVER',
  {pickup_at}, '{ADMIN}'::uuid, {paid_at}, NOW(), 'SEED', 'SEED'
FROM lottery_tickets lt
JOIN lottery_ticket_serials lts ON lts.ticket_id = lt.id AND lts.deleted_at IS NULL
WHERE lt.batch_code = {sql_str(BATCH)}
  AND lt.draw_date = DATE '{DRAW}'
  AND lt.station_id = {item['station_id']}
  AND lt.numbers = {sql_str(item['numbers'])}
  AND lts.serial_number = {sql_str(serial)}
  AND lt.deleted_at IS NULL;
"""
            )

    L("COMMIT;")
    return "\n".join(lines) + "\n"


def apply_sql(sql_path: Path, env: dict[str, str]) -> None:
    password = env.get("CORE_POSTGRES_PASSWORD", "12345")
    user = env.get("CORE_POSTGRES_USER", "sa")
    db = env.get("CORE_POSTGRES_DB", "daiphat_core_db")
    subprocess.run(
        ["docker", "cp", str(sql_path), "daiphat-postgres:/tmp/seed_demo.sql"],
        check=True,
    )
    result = subprocess.run(
        [
            "docker", "exec", "-e", f"PGPASSWORD={password}",
            "daiphat-postgres", "psql", "-U", user, "-d", db,
            "-v", "ON_ERROR_STOP=1", "-f", "/tmp/seed_demo.sql",
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    print(result.stdout[-5000:] if result.stdout else "")
    if result.returncode != 0:
        print(result.stderr[-5000:] if result.stderr else "")
        raise SystemExit(f"psql failed with code {result.returncode}")


def verify(env: dict[str, str]) -> None:
    sql = f"""
SELECT 'tickets' AS k, COUNT(*)::text FROM lottery_tickets WHERE batch_code = '{BATCH}' AND deleted_at IS NULL
UNION ALL
SELECT 'serials', COUNT(*)::text FROM lottery_ticket_serials s
JOIN lottery_tickets t ON t.id = s.ticket_id
WHERE t.batch_code = '{BATCH}' AND s.deleted_at IS NULL
UNION ALL
SELECT 'sold', COUNT(*)::text FROM lottery_ticket_serials s
JOIN lottery_tickets t ON t.id = s.ticket_id
WHERE t.batch_code = '{BATCH}' AND s.status = 'SOLD' AND s.deleted_at IS NULL
UNION ALL
SELECT 'orders', COUNT(*)::text FROM orders WHERE order_code LIKE 'ORD-20260818-SEED%'
UNION ALL
SELECT 'details', COUNT(*)::text FROM order_details od
JOIN orders o ON o.id = od.order_id
WHERE o.order_code LIKE 'ORD-20260818-SEED%'
UNION ALL
SELECT 'result_details', COUNT(*)::text FROM lottery_result_details d
JOIN lottery_results r ON r.id = d.lottery_result_id
WHERE r.draw_date = DATE '2026-08-18' AND d.deleted_at IS NULL;
"""
    print(docker_psql(env, sql))
    sample = docker_psql(
        env,
        f"SELECT serial_number, numbers FROM lottery_ticket_serials s "
        f"JOIN lottery_tickets t ON t.id = s.ticket_id "
        f"WHERE t.batch_code = '{BATCH}' ORDER BY s.id LIMIT 8;",
    )
    print("sample serials:\n" + sample)


def main() -> None:
    env = load_env()
    existing = load_existing_keys(env)
    print(f"existing tickets on {DRAW}: {len(existing)}")
    specs, orders = build_specs(existing)
    print("prize distribution:", dict(Counter(t["prize"] for t in specs if t["is_winner"])))
    print("winner stations:", dict(Counter(t["station_id"] for t in specs if t["is_winner"])))
    print("prefix spread (first2):", len({t["numbers"][:2] for t in specs}))
    print("suffix spread (last2):", len({t["numbers"][-2:] for t in specs}))
    print("orders:", len(orders), "sold:", sum(1 for t in specs if t["sold"]))

    sql = generate_sql(specs, orders)
    MIGRATION_DIR.mkdir(parents=True, exist_ok=True)
    SQL_PATH.write_text(sql, encoding="utf-8")
    print(f"Wrote {SQL_PATH} ({SQL_PATH.stat().st_size} bytes)")

    apply_sql(SQL_PATH, env)
    verify(env)

    SQL_PATH.unlink(missing_ok=True)
    print(f"Deleted {SQL_PATH.name}")


if __name__ == "__main__":
    main()
