#!/usr/bin/env python3
"""Generate seed_phu123_win50_online_claim.sql (50 winners + phu123 MEMBER).

Mirrors Win50PayoutSeedCatalog / PrizePayoutEligibilityService rules:
  - Every southern prize tier ≥ 3 winners
  - Exactly 30 ONLINE-claimable (G3–G8, KK ≤ 10M, not DB)
  - ONLINE COMPLETED orders, PROXY_HOLDING for online lines, SOLD serials
"""

from __future__ import annotations

from pathlib import Path

OUT = Path(__file__).with_name("seed_phu123_win50_online_claim.sql")

MEMBER_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
# BCrypt (Spring BCryptPasswordEncoder, $2a$10) of plaintext "Phu123A"
PASSWORD_HASH = "$2a$10$3GYnYpgK8o0bz2RIFYgl9OPSCiStpUdNfRIRzqdltJcgN3aILE7Jy"

SEED_MARKER = "PHU123_WIN50_SEED"
SERIAL_PREFIX = "PHU123W-"
ORDER_PREFIX = "ORD-PHU123-WIN-"
PAYMENT_PREFIX = "PAYOS-PHU123-WIN-"
BATCH_CODE = "PN-PHU123-WIN"
TICKET_PRICE = 10_000

PRIZES = ["DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "DB_PHU", "KK"]
PRIZE_COUNTS = [5, 5, 5, 5, 5, 5, 4, 4, 4, 5, 3]
ONLINE_CLAIMABLE = {"G3", "G4", "G5", "G6", "G7", "G8", "KK"}
RESULT_DETAIL_CODES = ["DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"]

# order_n -> (slots, cum_start exclusive, cum_end inclusive)
ORDER_PLANS = [
    (1, 6, 0, 6),
    (2, 5, 6, 11),
    (3, 5, 11, 16),
    (4, 4, 16, 20),
    (5, 4, 20, 24),
    (6, 4, 24, 28),
    (7, 3, 28, 31),
    (8, 3, 31, 34),
    (9, 3, 34, 37),
    (10, 3, 37, 40),
    (11, 5, 40, 45),
    (12, 5, 45, 50),
]

# Deterministic southern-style results per station slot (0..2). Suffixes nudged
# so G1–G8 do not collide with DB on LAST-digit matching.
RESULTS = {
    0: {
        "DB": "582917",
        "G1": "139204",
        "G2": "746385",
        "G3": "901572",
        "G4": "264830",
        "G5": "1583",
        "G6": "6729",
        "G7": "418",
        "G8": "73",
    },
    1: {
        "DB": "316842",
        "G1": "507391",
        "G2": "824156",
        "G3": "693047",
        "G4": "152978",
        "G5": "4061",
        "G6": "9382",
        "G7": "567",
        "G8": "29",
    },
    2: {
        "DB": "749063",
        "G1": "285714",
        "G2": "630195",
        "G3": "417826",
        "G4": "958301",
        "G5": "2740",
        "G6": "8516",
        "G7": "392",
        "G8": "64",
    },
}

# Draw offsets (days before CURRENT_DATE) — keep within customer window (≤25 days)
# and prefer older past days to reduce clashes with IBSEED inventory.
DRAW_OFFSETS = [8, 9, 10, 11, 12]


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
    for prize in PRIZES:
        win = results["DB"] if prize in ("DB_PHU", "KK") else results[prize]
        if matches(ticket, win, prize):
            return prize
    return None


def craft_ticket(prize: str, win_num: str, variant: int) -> str:
    w = win_num
    if prize == "DB":
        return w
    if prize == "DB_PHU":
        first = (int(w[0]) + 1 + variant) % 10
        if first == int(w[0]):
            first = (int(w[0]) + 3) % 10
        return f"{first}{w[1:]}"
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
    for attempt in range(200):
        salt = variant * 97 + attempt * 131 + 17
        if pref_len == 0:
            candidate = tail
        else:
            candidate = f"{salt % (10 ** pref_len):0{pref_len}d}{tail}"
        return candidate
    raise RuntimeError(f"craft failed for {prize}")


def build_winners() -> list[dict]:
    assert sum(PRIZE_COUNTS) == 50
    used: set[tuple[int, int, str]] = set()  # (station_slot, draw_offset, numbers)
    used_db_slots: set[tuple[int, int]] = set()
    winners: list[dict] = []
    idx = 0
    day_i = 0

    for prize_ord, prize in enumerate(PRIZES):
        count = PRIZE_COUNTS[prize_ord]
        for variant in range(count):
            placed = False
            for attempt in range(500):
                station_slot = (day_i + attempt) % 3
                draw_offset = DRAW_OFFSETS[(day_i + attempt) % len(DRAW_OFFSETS)]
                results = RESULTS[station_slot]
                db_slot = (station_slot, draw_offset)
                if prize == "DB" and db_slot in used_db_slots:
                    continue

                if prize == "DB":
                    numbers = results["DB"]
                else:
                    base = results["DB"] if prize in ("DB_PHU", "KK") else results[prize]
                    numbers = craft_ticket(prize, base, variant * 11 + attempt * 7 + day_i + 3)

                if first_prize(numbers, results) != prize:
                    continue
                key = (station_slot, draw_offset, numbers)
                if key in used:
                    continue

                used.add(key)
                if prize == "DB":
                    used_db_slots.add(db_slot)
                idx += 1
                winners.append(
                    {
                        "idx": idx,
                        "station_slot": station_slot,
                        "draw_offset": draw_offset,
                        "numbers": numbers,
                        "prize": prize,
                        "online": prize in ONLINE_CLAIMABLE,
                        "serial": f"{SERIAL_PREFIX}{idx:03d}-{numbers}",
                    }
                )
                day_i += 1
                placed = True
                break
            if not placed:
                raise RuntimeError(f"Could not place prize {prize} variant {variant}")

    online = sum(1 for w in winners if w["online"])
    if online != 30:
        raise RuntimeError(f"Expected 30 online-claimable, got {online}")
    for prize, need in zip(PRIZES, PRIZE_COUNTS):
        got = sum(1 for w in winners if w["prize"] == prize)
        if got != need:
            raise RuntimeError(f"Prize {prize}: expected {need}, got {got}")
        if got < 3:
            raise RuntimeError(f"Prize {prize} has fewer than 3 winners")
    return winners


def sql_str(value: object) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def emit_sql(winners: list[dict]) -> str:
    lines: list[str] = []
    a = lines.append

    a("-- =============================================================================")
    a("-- Manual test seeder: MEMBER phu123 + 50 winning tickets across multiple orders")
    a("-- =============================================================================")
    a("-- Prerequisites (already present from Flyway / Java station seed):")
    a("--   * roles.ROLE_MEMBER")
    a("--   * ≥3 active lottery_stations")
    a("--   * prize_structures for MIEN_NAM (DB, G1–G8, DB_PHU, KK)")
    a("--")
    a("-- Creates / upserts:")
    a("--   * users.username = phu123 / password Phu123A (BCrypt) / ROLE_MEMBER")
    a("--   * 50 lottery_tickets + serials (prefix PHU123W-)")
    a("--   * COMPLETED lottery_results matching those wins")
    a("--   * 12 ONLINE COMPLETED orders ORD-PHU123-WIN-001..012 owned by phu123")
    a("--   * 30 PROXY_HOLDING lines → online-claim eligible (G3–G8, KK ≤ 10M)")
    a("--   * 20 HANDED_OVER lines → in-person only (DB, G1, G2, DB_PHU)")
    a("--")
    a("-- Idempotent: re-running deletes prior rows tagged PHU123_WIN50_SEED / prefixes.")
    a("-- Apply:  psql -U <user> -d <db> -f scripts/seed_phu123_win50_online_claim.sql")
    a("-- Regenerated by: python scripts/generate_seed_phu123_win50.py")
    a("-- =============================================================================")
    a("")
    a("BEGIN;")
    a("")
    a("-- ---------- cleanup previous run ----------")
    a("DELETE FROM prize_payout_requests")
    a(" WHERE serial_id IN (")
    a("     SELECT id FROM lottery_ticket_serials WHERE serial_number LIKE 'PHU123W-%'")
    a(" )")
    a("    OR order_id IN (SELECT id FROM orders WHERE order_code LIKE 'ORD-PHU123-WIN-%');")
    a("")
    a("DELETE FROM order_details")
    a(" WHERE order_id IN (SELECT id FROM orders WHERE order_code LIKE 'ORD-PHU123-WIN-%');")
    a("DELETE FROM transactions")
    a(" WHERE order_id IN (SELECT id FROM orders WHERE order_code LIKE 'ORD-PHU123-WIN-%')")
    a("    OR payment_ref LIKE 'PAYOS-PHU123-WIN-%';")
    a("DELETE FROM orders WHERE order_code LIKE 'ORD-PHU123-WIN-%';")
    a("")
    a("DELETE FROM lottery_result_details")
    a(" WHERE lottery_result_id IN (")
    a("     SELECT id FROM lottery_results")
    a("      WHERE created_by = 'PHU123_WIN50_SEED'")
    a("         OR last_modified_by = 'PHU123_WIN50_SEED'")
    a(" );")
    a("DELETE FROM lottery_results")
    a(" WHERE created_by = 'PHU123_WIN50_SEED'")
    a("    OR last_modified_by = 'PHU123_WIN50_SEED';")
    a("")
    a("DELETE FROM lottery_ticket_serials WHERE serial_number LIKE 'PHU123W-%';")
    a("DELETE FROM lottery_tickets WHERE batch_code = 'PN-PHU123-WIN';")
    a("")
    a("DELETE FROM user_bank_accounts")
    a(" WHERE user_id IN (SELECT id FROM users WHERE username = 'phu123');")
    a("")
    a("-- ---------- member user phu123 ----------")
    a("INSERT INTO users (")
    a("    id, role_id, username, email, phone, first_name, last_name,")
    a("    status, is_email_verified, agreed_to_terms, has_password, password,")
    a("    created_at, updated_at, created_by, last_modified_by")
    a(")")
    a("SELECT")
    a(f"    '{MEMBER_UUID}'::uuid,")
    a("    r.id,")
    a("    'phu123',")
    a("    'phu123@daiphat.test',")
    a("    '0909123123',")
    a("    'Phu',")
    a("    'Nguyen',")
    a("    'ACTIVE',")
    a("    TRUE,")
    a("    TRUE,")
    a("    TRUE,")
    a(f"    {sql_str(PASSWORD_HASH)},")
    a("    NOW(),")
    a("    NOW(),")
    a(f"    {sql_str(SEED_MARKER)},")
    a(f"    {sql_str(SEED_MARKER)}")
    a("FROM roles r")
    a("WHERE r.code = 'ROLE_MEMBER' AND r.deleted_at IS NULL")
    a("ON CONFLICT (username) DO UPDATE SET")
    a("    role_id = EXCLUDED.role_id,")
    a("    email = EXCLUDED.email,")
    a("    phone = EXCLUDED.phone,")
    a("    first_name = EXCLUDED.first_name,")
    a("    last_name = EXCLUDED.last_name,")
    a("    status = 'ACTIVE',")
    a("    is_email_verified = TRUE,")
    a("    has_password = TRUE,")
    a("    password = EXCLUDED.password,")
    a("    deleted_at = NULL,")
    a("    updated_at = NOW(),")
    a(f"    last_modified_by = {sql_str(SEED_MARKER)};")
    a("")
    a("-- If username conflict path updated a different id, align to fixed UUID when free.")
    a("-- (No-op when phu123 already owns MEMBER_UUID.)")
    a("")
    a("INSERT INTO user_bank_accounts (")
    a("    user_id, bank_name, bank_bin, bank_account_no, bank_account_name,")
    a("    is_default, created_at, updated_at, created_by, last_modified_by")
    a(")")
    a("SELECT")
    a("    u.id,")
    a("    'Vietcombank',")
    a("    '970436',")
    a("    '0123456789',")
    a("    'NGUYEN PHU',")
    a("    TRUE,")
    a("    NOW(),")
    a("    NOW(),")
    a(f"    {sql_str(SEED_MARKER)},")
    a(f"    {sql_str(SEED_MARKER)}")
    a("FROM users u")
    a("WHERE u.username = 'phu123' AND u.deleted_at IS NULL")
    a("ON CONFLICT (user_id, bank_bin, bank_account_no) DO UPDATE SET")
    a("    is_default = TRUE,")
    a("    bank_account_name = EXCLUDED.bank_account_name,")
    a("    updated_at = NOW();")
    a("")
    a("-- Staging table for winners (station_slot 0..2 maps to 3 active stations by id ASC)")
    a("CREATE TEMP TABLE tmp_phu123_winners (")
    a("    idx            INT PRIMARY KEY,")
    a("    station_slot   INT NOT NULL,")
    a("    draw_offset    INT NOT NULL,")
    a("    numbers        VARCHAR(20) NOT NULL,")
    a("    prize          VARCHAR(20) NOT NULL,")
    a("    online_claim   BOOLEAN NOT NULL,")
    a("    serial_number  VARCHAR(100) NOT NULL")
    a(") ON COMMIT DROP;")
    a("")
    a("INSERT INTO tmp_phu123_winners (idx, station_slot, draw_offset, numbers, prize, online_claim, serial_number) VALUES")

    value_rows = []
    for w in winners:
        value_rows.append(
            "    ({idx}, {slot}, {off}, {nums}, {prize}, {online}, {serial})".format(
                idx=w["idx"],
                slot=w["station_slot"],
                off=w["draw_offset"],
                nums=sql_str(w["numbers"]),
                prize=sql_str(w["prize"]),
                online="TRUE" if w["online"] else "FALSE",
                serial=sql_str(w["serial"]),
            )
        )
    a(",\n".join(value_rows) + ";")
    a("")

    # Results staging: unique (station_slot, draw_offset) with prize numbers
    draw_keys = sorted({(w["station_slot"], w["draw_offset"]) for w in winners})
    a("CREATE TEMP TABLE tmp_phu123_results (")
    a("    station_slot INT NOT NULL,")
    a("    draw_offset  INT NOT NULL,")
    a("    prize_code   VARCHAR(20) NOT NULL,")
    a("    winning_number VARCHAR(20) NOT NULL,")
    a("    PRIMARY KEY (station_slot, draw_offset, prize_code)")
    a(") ON COMMIT DROP;")
    a("")
    a("INSERT INTO tmp_phu123_results (station_slot, draw_offset, prize_code, winning_number) VALUES")
    result_rows = []
    for slot, off in draw_keys:
        r = RESULTS[slot]
        for code in RESULT_DETAIL_CODES:
            win = pad_win(code, r[code])
            result_rows.append(f"    ({slot}, {off}, {sql_str(code)}, {sql_str(win)})")
        # DB_PHU / KK details store the DB number (matcher uses SPECIAL_CONSOLATION_*)
        result_rows.append(f"    ({slot}, {off}, 'DB_PHU', {sql_str(r['DB'])})")
        result_rows.append(f"    ({slot}, {off}, 'KK', {sql_str(r['DB'])})")
    a(",\n".join(result_rows) + ";")
    a("")

    a("DO $$")
    a("DECLARE")
    a("    v_member      UUID;")
    a("    v_importer    UUID;")
    a("    v_stations    BIGINT[];")
    a("    v_region_id   BIGINT;")
    a("    v_station_id  BIGINT;")
    a("    v_draw_date   DATE;")
    a("    v_ticket_id   BIGINT;")
    a("    v_serial_id   BIGINT;")
    a("    v_result_id   BIGINT;")
    a("    v_ps_id       BIGINT;")
    a("    v_order_id    UUID;")
    a("    v_paid_at     TIMESTAMP;")
    a("    v_pickup_at   TIMESTAMP;")
    a("    v_total       NUMERIC(15,0);")
    a("    v_slots       INT;")
    a("    r_win         RECORD;")
    a("    r_res         RECORD;")
    a("    r_plan        RECORD;")
    a("BEGIN")
    a("    SELECT id INTO v_member FROM users WHERE username = 'phu123' AND deleted_at IS NULL;")
    a("    IF v_member IS NULL THEN")
    a("        RAISE EXCEPTION 'phu123 user missing after upsert';")
    a("    END IF;")
    a("")
    a("    -- Prefer staff operator for imported_by / handover; fall back to member.")
    a("    SELECT u.id INTO v_importer")
    a("    FROM users u")
    a("    JOIN roles r ON r.id = u.role_id")
    a("    WHERE u.deleted_at IS NULL")
    a("      AND r.code IN ('ROLE_STAFF_OPERATOR', 'ROLE_ADMIN')")
    a("    ORDER BY CASE r.code")
    a("        WHEN 'ROLE_STAFF_OPERATOR' THEN 0")
    a("        WHEN 'ROLE_ADMIN' THEN 1")
    a("        ELSE 2 END")
    a("    LIMIT 1;")
    a("    IF v_importer IS NULL THEN")
    a("        v_importer := v_member;")
    a("    END IF;")
    a("")
    a("    SELECT array_agg(id ORDER BY id) INTO v_stations")
    a("    FROM (")
    a("        SELECT id")
    a("        FROM lottery_stations")
    a("        WHERE deleted_at IS NULL AND COALESCE(is_active, TRUE) = TRUE")
    a("        ORDER BY id")
    a("        LIMIT 3")
    a("    ) s;")
    a("    IF v_stations IS NULL OR array_length(v_stations, 1) < 3 THEN")
    a("        RAISE EXCEPTION 'Need ≥3 active lottery_stations (run SouthernLotteryStationSeed)';")
    a("    END IF;")
    a("")
    a("    SELECT id INTO v_region_id FROM lottery_regions WHERE code = 'MIEN_NAM' LIMIT 1;")
    a("    IF v_region_id IS NULL THEN")
    a("        SELECT region_id INTO v_region_id FROM prize_structures")
    a("        WHERE prize_code = 'DB' AND deleted_at IS NULL LIMIT 1;")
    a("    END IF;")
    a("    IF v_region_id IS NULL THEN")
    a("        RAISE EXCEPTION 'prize_structures / MIEN_NAM region missing';")
    a("    END IF;")
    a("")
    a("    -- Ensure all required prize codes exist")
    a("    IF (SELECT COUNT(*) FROM prize_structures")
    a("        WHERE region_id = v_region_id AND deleted_at IS NULL")
    a("          AND prize_code IN ('DB','G1','G2','G3','G4','G5','G6','G7','G8','DB_PHU','KK')) < 11 THEN")
    a("        RAISE EXCEPTION 'Missing southern prize_structures (need DB,G1-G8,DB_PHU,KK)';")
    a("    END IF;")
    a("")
    a("    -- ---- lottery results ----")
    a("    FOR r_res IN")
    a("        SELECT DISTINCT station_slot, draw_offset FROM tmp_phu123_results")
    a("    LOOP")
    a("        v_station_id := v_stations[r_res.station_slot + 1];")
    a("        v_draw_date := CURRENT_DATE - r_res.draw_offset;")
    a("")
    a("        -- Refuse to clobber a non-seed result for the same station/date.")
    a("        IF EXISTS (")
    a("            SELECT 1 FROM lottery_results lr")
    a("             WHERE lr.station_id = v_station_id")
    a("               AND lr.draw_date = v_draw_date")
    a("               AND lr.deleted_at IS NULL")
    a("               AND COALESCE(lr.created_by, '') NOT IN ('PHU123_WIN50_SEED')")
    a("               AND COALESCE(lr.last_modified_by, '') NOT IN ('PHU123_WIN50_SEED')")
    a("        ) THEN")
    a("            RAISE EXCEPTION")
    a("                'lottery_results already exists for station % on % (not owned by PHU123_WIN50_SEED). Clear it or change DRAW_OFFSETS.',")
    a("                v_station_id, v_draw_date;")
    a("        END IF;")
    a("")
    a("        INSERT INTO lottery_results (")
    a("            station_id, draw_date, source, is_official, status, published_at,")
    a("            created_at, updated_at, created_by, last_modified_by")
    a("        ) VALUES (")
    a("            v_station_id, v_draw_date, 'MANUAL', TRUE, 'COMPLETED',")
    a("            (v_draw_date + TIME '16:35'),")
    a("            NOW(), NOW(), 'PHU123_WIN50_SEED', 'PHU123_WIN50_SEED'")
    a("        )")
    a("        ON CONFLICT (station_id, draw_date) DO UPDATE SET")
    a("            source = 'MANUAL',")
    a("            is_official = TRUE,")
    a("            status = 'COMPLETED',")
    a("            published_at = EXCLUDED.published_at,")
    a("            deleted_at = NULL,")
    a("            updated_at = NOW(),")
    a("            created_by = 'PHU123_WIN50_SEED',")
    a("            last_modified_by = 'PHU123_WIN50_SEED'")
    a("        RETURNING id INTO v_result_id;")
    a("")
    a("        SELECT id INTO v_result_id FROM lottery_results")
    a("        WHERE station_id = v_station_id AND draw_date = v_draw_date;")
    a("")
    a("        DELETE FROM lottery_result_details WHERE lottery_result_id = v_result_id;")
    a("")
    a("        INSERT INTO lottery_result_details (")
    a("            lottery_result_id, prize_structure_id, winning_number,")
    a("            created_at, updated_at, created_by, last_modified_by")
    a("        )")
    a("        SELECT")
    a("            v_result_id,")
    a("            ps.id,")
    a("            tr.winning_number,")
    a("            NOW(), NOW(), 'PHU123_WIN50_SEED', 'PHU123_WIN50_SEED'")
    a("        FROM tmp_phu123_results tr")
    a("        JOIN prize_structures ps")
    a("          ON ps.prize_code = tr.prize_code")
    a("         AND ps.region_id = v_region_id")
    a("         AND ps.deleted_at IS NULL")
    a("        WHERE tr.station_slot = r_res.station_slot")
    a("          AND tr.draw_offset = r_res.draw_offset;")
    a("    END LOOP;")
    a("")
    a("    -- ---- tickets + serials ----")
    a("    FOR r_win IN SELECT * FROM tmp_phu123_winners ORDER BY idx")
    a("    LOOP")
    a("        v_station_id := v_stations[r_win.station_slot + 1];")
    a("        v_draw_date := CURRENT_DATE - r_win.draw_offset;")
    a("")
    a("        -- Drop any leftover ticket on the same station/date/numbers (unique index).")
    a("        DELETE FROM lottery_ticket_serials s")
    a("         USING lottery_tickets t")
    a("         WHERE s.ticket_id = t.id")
    a("           AND t.station_id = v_station_id")
    a("           AND t.numbers = r_win.numbers")
    a("           AND t.draw_date = v_draw_date")
    a("           AND t.deleted_at IS NULL")
    a("           AND NOT EXISTS (")
    a("               SELECT 1 FROM order_details od")
    a("               WHERE od.lottery_ticket_serial_id = s.id")
    a("           );")
    a("        DELETE FROM lottery_tickets t")
    a("         WHERE t.station_id = v_station_id")
    a("           AND t.numbers = r_win.numbers")
    a("           AND t.draw_date = v_draw_date")
    a("           AND t.deleted_at IS NULL")
    a("           AND NOT EXISTS (")
    a("               SELECT 1 FROM lottery_ticket_serials s WHERE s.ticket_id = t.id")
    a("           );")
    a("")
    a("        INSERT INTO lottery_tickets (")
    a("            station_id, numbers, draw_date, price_snapshot, status, is_active,")
    a("            batch_code, created_at, updated_at, created_by, last_modified_by")
    a("        ) VALUES (")
    a("            v_station_id, r_win.numbers, v_draw_date, 10000, 'SOLD_OUT', FALSE,")
    a("            'PN-PHU123-WIN', NOW(), NOW(), 'PHU123_WIN50_SEED', 'PHU123_WIN50_SEED'")
    a("        )")
    a("        RETURNING id INTO v_ticket_id;")
    a("")
    a("        INSERT INTO lottery_ticket_serials (")
    a("            ticket_id, serial_number, status, ticket_condition, payout_state,")
    a("            input_source, station_id, draw_date, imported_by, imported_at,")
    a("            is_verified, created_at, updated_at, created_by, last_modified_by")
    a("        ) VALUES (")
    a("            v_ticket_id, r_win.serial_number, 'SOLD', 'GOOD', 'NONE',")
    a("            'MANUAL', v_station_id, v_draw_date, v_importer, NOW(),")
    a("            TRUE, NOW(), NOW(), 'PHU123_WIN50_SEED', 'PHU123_WIN50_SEED'")
    a("        );")
    a("    END LOOP;")
    a("")
    a("    -- ---- orders (12) ----")
    a("    FOR r_plan IN")
    a("        SELECT * FROM (VALUES")
    for i, (order_n, slots, cum_start, cum_end) in enumerate(ORDER_PLANS):
        comma = "," if i < len(ORDER_PLANS) - 1 else ""
        a(f"            ({order_n}, {slots}, {cum_start}, {cum_end}){comma}")
    a("        ) AS p(order_n, slots, cum_start, cum_end)")
    a("    LOOP")
    a("        SELECT MIN(CURRENT_DATE - w.draw_offset)")
    a("        INTO v_draw_date")
    a("        FROM tmp_phu123_winners w")
    a("        WHERE w.idx > r_plan.cum_start AND w.idx <= r_plan.cum_end;")
    a("")
    a("        v_paid_at := (v_draw_date + TIME '09:45') + ((r_plan.order_n - 1) * INTERVAL '17 minutes');")
    a("        v_pickup_at := (v_draw_date + TIME '18:10') + ((r_plan.order_n - 1) * INTERVAL '9 minutes');")
    a("        v_slots := r_plan.slots;")
    a("        v_total := 10000 * v_slots;")
    a("        v_order_id := gen_random_uuid();")
    a("")
    a("        INSERT INTO orders (")
    a("            id, user_id, name, phone, email, order_code, order_type, receive_type,")
    a("            total_amount, status, expected_pickup_at, actual_picked_up_at, picked_up_by,")
    a("            created_at, updated_at, created_by, last_modified_by")
    a("        ) VALUES (")
    a("            v_order_id,")
    a("            v_member,")
    a("            'Phu Nguyen',")
    a("            (SELECT phone FROM users WHERE id = v_member),")
    a("            (SELECT email FROM users WHERE id = v_member),")
    a("            'ORD-PHU123-WIN-' || LPAD(r_plan.order_n::text, 3, '0'),")
    a("            'ONLINE',")
    a("            'COUNTER_PICKUP',")
    a("            v_total,")
    a("            'COMPLETED',")
    a("            v_paid_at + INTERVAL '7 hours',")
    a("            v_pickup_at,")
    a("            v_importer,")
    a("            v_paid_at,")
    a("            NOW(),")
    a("            'PHU123_WIN50_SEED',")
    a("            'PHU123_WIN50_SEED'")
    a("        );")
    a("")
    a("        INSERT INTO transactions (")
    a("            order_id, amount, gateway, status, paid_at, type, payment_ref,")
    a("            created_at, updated_at, created_by, last_modified_by")
    a("        ) VALUES (")
    a("            v_order_id,")
    a("            v_total,")
    a("            'PAYOS',")
    a("            'COMPLETED',")
    a("            v_paid_at,")
    a("            'ONLINE',")
    a("            'PAYOS-PHU123-WIN-' || LPAD(r_plan.order_n::text, 3, '0'),")
    a("            v_paid_at,")
    a("            NOW(),")
    a("            'PHU123_WIN50_SEED',")
    a("            'PHU123_WIN50_SEED'")
    a("        );")
    a("")
    a("        INSERT INTO order_details (")
    a("            order_id, lottery_ticket_id, lottery_ticket_serial_id,")
    a("            quantity, price, status, handed_over_at, handed_over_by,")
    a("            created_at, updated_at, created_by, last_modified_by")
    a("        )")
    a("        SELECT")
    a("            v_order_id,")
    a("            t.id,")
    a("            s.id,")
    a("            1,")
    a("            10000,")
    a("            CASE WHEN w.online_claim THEN 'PROXY_HOLDING' ELSE 'HANDED_OVER' END,")
    a("            CASE WHEN w.online_claim THEN NULL ELSE v_pickup_at END,")
    a("            CASE WHEN w.online_claim THEN NULL ELSE v_importer END,")
    a("            v_paid_at,")
    a("            NOW(),")
    a("            'PHU123_WIN50_SEED',")
    a("            'PHU123_WIN50_SEED'")
    a("        FROM tmp_phu123_winners w")
    a("        JOIN lottery_ticket_serials s")
    a("          ON s.serial_number = w.serial_number AND s.deleted_at IS NULL")
    a("        JOIN lottery_tickets t ON t.id = s.ticket_id AND t.deleted_at IS NULL")
    a("        WHERE w.idx > r_plan.cum_start AND w.idx <= r_plan.cum_end;")
    a("    END LOOP;")
    a("")
    a("    RAISE NOTICE 'PHU123 Win50 seed OK: member=%, tickets=50, online_claimable=30, orders=12',")
    a("        v_member;")
    a("END $$;")
    a("")
    a("-- ---------- verification ----------")
    a("SELECT 'users' AS check, COUNT(*)::text AS value FROM users WHERE username = 'phu123'")
    a("UNION ALL")
    a("SELECT 'winning_tickets', COUNT(*)::text FROM lottery_tickets WHERE batch_code = 'PN-PHU123-WIN'")
    a("UNION ALL")
    a("SELECT 'sold_serials', COUNT(*)::text FROM lottery_ticket_serials WHERE serial_number LIKE 'PHU123W-%' AND status = 'SOLD'")
    a("UNION ALL")
    a("SELECT 'orders', COUNT(*)::text FROM orders WHERE order_code LIKE 'ORD-PHU123-WIN-%'")
    a("UNION ALL")
    a("SELECT 'online_claimable_details', COUNT(*)::text")
    a("  FROM order_details od")
    a("  JOIN orders o ON o.id = od.order_id")
    a(" WHERE o.order_code LIKE 'ORD-PHU123-WIN-%' AND od.status = 'PROXY_HOLDING'")
    a("UNION ALL")
    a("SELECT 'in_person_details', COUNT(*)::text")
    a("  FROM order_details od")
    a("  JOIN orders o ON o.id = od.order_id")
    a(" WHERE o.order_code LIKE 'ORD-PHU123-WIN-%' AND od.status = 'HANDED_OVER';")
    a("")
    a("COMMIT;")
    a("")

    return "\n".join(lines)


def main() -> None:
    winners = build_winners()
    sql = emit_sql(winners)
    OUT.write_text(sql, encoding="utf-8")
    online = sum(1 for w in winners if w["online"])
    print(f"Wrote {OUT} ({len(winners)} winners, {online} online-claimable)")


if __name__ == "__main__":
    main()
