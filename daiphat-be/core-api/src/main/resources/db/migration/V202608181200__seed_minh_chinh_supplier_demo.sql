-- Demo seed: supplier Minh Chính + 3 draw days (yesterday / today / tomorrow VN).
-- Each day: 2 import batches (NEW 250 + SUPPLEMENTARY 250 per draw-day station),
-- 1 SUPPLIER_RETURN, 1 supplier_settlement. Serial statuses/conditions are round-robined.
--
-- Requires active lottery_stations (SouthernLotteryStationSeedInitializer) and at least one user.
-- Idempotent: skips ticket/batch seed when MC-SEED-* batches already exist for the window.

DO $$
DECLARE
    v_tz              CONSTANT text := 'Asia/Ho_Chi_Minh';
    v_marker          CONSTANT text := 'MC_SEED';
    v_supplier_code   CONSTANT text := 'MINHCHINH';
    v_qty_per_line    CONSTANT int := 250;
    v_return_buffer   CONSTANT interval := interval '45 minutes';
    v_import_from     CONSTANT time := time '08:00';
    v_return_cutoff   CONSTANT time := time '14:30';
    v_payment_cutoff  CONSTANT time := time '18:00';
    v_fallback_cost   CONSTANT numeric(18, 3) := 9500.000;

    v_lucky text[] := ARRAY[
        '68', '86', '78', '79', '38', '39', '28', '88', '66', '99',
        '18', '58', '08', '89', '69', '36', '63', '98', '16', '39'
    ];
    v_serial_statuses text[] := ARRAY[
        'IN_STOCK', 'RESERVED', 'SOLD', 'PROXY_HOLDING', 'WITH_STREET_AGENT', 'EXPIRED'
    ];
    v_conditions text[] := ARRAY['GOOD', 'DAMAGED', 'LOST', 'VOIDED'];

    v_now             timestamp;
    v_today           date;
    v_actor_id        uuid;
    v_supplier_id     bigint;
    v_import_cost     numeric(18, 3);
    v_unit_price      numeric(18, 3);
    v_day_offset      int;
    v_draw_date       date;
    v_day_name        text;
    v_compact         text;
    v_station_ids     bigint[];
    v_station_id      bigint;
    v_station_code    text;
    v_station_price   numeric(15, 0);
    v_station_comm    numeric(5, 4);
    v_settlement_id   bigint;
    v_batch_a_id      bigint;
    v_batch_b_id      bigint;
    v_line_a_id       bigint;
    v_line_b_id       bigint;
    v_return_id       bigint;
    v_return_line_id  bigint;
    v_ticket_id       bigint;
    v_numbers         text;
    v_prefix          int;
    v_suffix          text;
    v_serial          text;
    v_serial_status   text;
    v_condition       text;
    v_is_lucky        boolean;
    v_ticket_status   text;
    v_ticket_active   boolean;
    v_batch_a_code    text;
    v_batch_b_code    text;
    v_line_a_code     text;
    v_line_b_code     text;
    v_ss_code         text;
    v_rb_code         text;
    v_imported_at     timestamp;
    v_completed_at    timestamp;
    v_return_status   text;
    v_line_status     text;
    v_attach_returns  boolean;
    v_settlement_status text;
    v_recon_phase     text;
    v_is_return_expired boolean;
    v_sys_import_qty  int;
    v_sys_import_val  numeric(18, 3);
    v_sys_return_qty  int;
    v_sys_return_val  numeric(18, 3);
    v_remaining       numeric(18, 3);
    v_paid            numeric(18, 3);
    v_i               int;
    v_attempt         int;
    v_station_count   int;
    v_line_cost       numeric(18, 3);
    v_batch_declare   int;
    v_batch_cost      numeric(18, 3);
    v_evidence_url    text := 'https://seed.local/mc/invoice.png';
    v_list_urls       jsonb := '["https://seed.local/mc/ticket-list.png"]'::jsonb;
    v_payment_urls    jsonb := '["https://seed.local/mc/payment-receipt.png"]'::jsonb;
    v_return_evidence text := 'https://seed.local/mc/return-evidence.png';
    v_eligible_ids    bigint[];
    v_attach_n        int;
    v_attach_id       bigint;
BEGIN
    v_now := (CURRENT_TIMESTAMP AT TIME ZONE v_tz);
    v_today := v_now::date;

    -- Guards -----------------------------------------------------------------
    SELECT id INTO v_actor_id
    FROM users
    WHERE deleted_at IS NULL
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION
            'MC_SEED: no user found. Create at least one user before applying this seed.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM lottery_stations
        WHERE deleted_at IS NULL
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION
            'MC_SEED: no active lottery_stations. Start the app once so SouthernLotteryStationSeedInitializer runs, then re-apply / repair this migration.';
    END IF;

    -- Supplier upsert --------------------------------------------------------
    INSERT INTO lottery_suppliers (
        name, code, type, contact_name, contact_phone, contact_email, address,
        tax_code, payment_term_days, default_import_cost,
        import_allow_from, return_cut_off_time, payment_cut_off_time,
        is_active, created_at, updated_at, created_by, last_modified_by
    ) VALUES (
        'Minh Chính', v_supplier_code, 'DISTRIBUTOR', 'Minh Chính', '0909123456',
        'minhchinh@seed.local', 'TP. Hồ Chí Minh', '0312345678', 0, v_fallback_cost,
        v_import_from, v_return_cutoff, v_payment_cutoff,
        TRUE, v_now, v_now, v_marker, v_marker
    )
    ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        contact_name = EXCLUDED.contact_name,
        contact_phone = EXCLUDED.contact_phone,
        payment_term_days = EXCLUDED.payment_term_days,
        default_import_cost = EXCLUDED.default_import_cost,
        import_allow_from = EXCLUDED.import_allow_from,
        return_cut_off_time = EXCLUDED.return_cut_off_time,
        payment_cut_off_time = EXCLUDED.payment_cut_off_time,
        is_active = TRUE,
        deleted_at = NULL,
        updated_at = EXCLUDED.updated_at,
        last_modified_by = EXCLUDED.last_modified_by
    RETURNING id INTO v_supplier_id;

    IF v_supplier_id IS NULL THEN
        SELECT id INTO v_supplier_id
        FROM lottery_suppliers
        WHERE code = v_supplier_code AND deleted_at IS NULL;
    END IF;

    -- Idempotency: skip if any MC-SEED batch already exists in the 3-day window
    IF EXISTS (
        SELECT 1
        FROM import_batches
        WHERE deleted_at IS NULL
          AND batch_code LIKE 'MC-SEED-%'
          AND draw_date BETWEEN (v_today - 1) AND (v_today + 1)
    ) THEN
        RAISE NOTICE
            'MC_SEED: import batches MC-SEED-* already present for %..%; skipping demo ticket seed.',
            v_today - 1, v_today + 1;
        RETURN;
    END IF;

    -- Default unit cost from first active station (price × (1 − commission))
    SELECT ROUND(
               s.price * (1 - COALESCE(s.commission_rate, 0.0500)),
               3
           )
    INTO v_import_cost
    FROM lottery_stations s
    WHERE s.deleted_at IS NULL
      AND s.is_active = TRUE
    ORDER BY s.id
    LIMIT 1;

    IF v_import_cost IS NULL OR v_import_cost <= 0 THEN
        v_import_cost := v_fallback_cost;
    END IF;
    v_unit_price := v_import_cost;

    UPDATE lottery_suppliers
    SET default_import_cost = v_import_cost,
        updated_at = v_now,
        last_modified_by = v_marker
    WHERE id = v_supplier_id;

    -- Seed each day ----------------------------------------------------------
    FOR v_day_offset IN -1..1 LOOP
        v_draw_date := v_today + v_day_offset;
        v_compact := to_char(v_draw_date, 'YYYYMMDD');
        v_day_name := CASE EXTRACT(ISODOW FROM v_draw_date)::int
            WHEN 1 THEN 'MONDAY'
            WHEN 2 THEN 'TUESDAY'
            WHEN 3 THEN 'WEDNESDAY'
            WHEN 4 THEN 'THURSDAY'
            WHEN 5 THEN 'FRIDAY'
            WHEN 6 THEN 'SATURDAY'
            ELSE 'SUNDAY'
        END;

        SELECT COALESCE(array_agg(s.id ORDER BY s.id), ARRAY[]::bigint[])
        INTO v_station_ids
        FROM lottery_stations s
        WHERE s.deleted_at IS NULL
          AND s.is_active = TRUE
          AND s.draw_days @> to_jsonb(v_day_name);

        v_station_count := COALESCE(cardinality(v_station_ids), 0);
        IF v_station_count = 0 THEN
            RAISE WARNING
                'MC_SEED: no stations draw on % (%); skipping that day.',
                v_draw_date, v_day_name;
            CONTINUE;
        END IF;

        v_imported_at := (v_draw_date::timestamp + time '09:00');
        IF v_day_offset = 1 THEN
            -- Tomorrow: imported "today" morning in seed terms
            v_imported_at := (v_today::timestamp + time '09:00');
        ELSIF v_day_offset = 0 AND v_now::time < v_import_from THEN
            v_imported_at := v_now;
        END IF;
        v_completed_at := v_imported_at + interval '30 minutes';

        -- Timeline: return / settlement maturity
        IF v_day_offset < 0 THEN
            v_return_status := 'HANDED_OVER';
            v_line_status := 'INSPECTED';
            v_attach_returns := TRUE;
            v_is_return_expired := TRUE;
            v_settlement_status := 'CLOSED';
            v_recon_phase := 'COMPLETED';
        ELSIF v_day_offset > 0 THEN
            v_return_status := 'PENDING_INSPECTION';
            v_line_status := 'PENDING';
            v_attach_returns := FALSE;
            v_is_return_expired := FALSE;
            v_settlement_status := 'OPEN';
            v_recon_phase := 'MATCHING';
        ELSE
            -- Today relative to cutoffs
            IF v_now::time < (v_return_cutoff - v_return_buffer) THEN
                v_return_status := 'PENDING_INSPECTION';
                v_line_status := 'PENDING';
                v_attach_returns := FALSE;
            ELSIF v_now::time < v_return_cutoff THEN
                v_return_status := 'INSPECTING';
                v_line_status := 'INSPECTING';
                v_attach_returns := FALSE;
            ELSE
                v_return_status := 'HANDED_OVER';
                v_line_status := 'INSPECTED';
                v_attach_returns := TRUE;
            END IF;
            v_is_return_expired := (v_now::time >= v_return_cutoff);
            IF v_now::time >= v_payment_cutoff AND v_return_status <> 'HANDED_OVER' THEN
                v_settlement_status := 'RECEIPT_OVERDUE';
            ELSIF v_now::time >= v_payment_cutoff AND v_return_status = 'HANDED_OVER' THEN
                -- Past payment cutoff but we leave unpaid → overdue for demo of open debt
                v_settlement_status := 'RECEIPT_OVERDUE';
            ELSE
                v_settlement_status := 'OPEN';
            END IF;
            v_recon_phase := 'MATCHING';
        END IF;

        -- Settlement header
        v_ss_code := 'SS-MC-' || v_compact;
        INSERT INTO supplier_settlements (
            lottery_supplier_id, period_from, period_to, supplier_settlement_code,
            total_import_value, total_return_value, total_paid_amount, remaining_amount,
            status, reconciliation_phase, is_return_expired, expired_return_value,
            original_ticket_unit_price, reconciled_ticket_unit_price,
            discrepancy_types, discrepancy_items, payment_evidence_urls,
            import_quantity_mismatch, import_value_mismatch,
            return_quantity_mismatch, return_value_mismatch,
            import_discrepancy_resolved, return_discrepancy_resolved,
            unit_price_discrepancy_resolved,
            created_at, updated_at, created_by, last_modified_by
        ) VALUES (
            v_supplier_id, v_draw_date, v_draw_date, v_ss_code,
            0, 0, 0, 0,
            v_settlement_status, v_recon_phase, v_is_return_expired, 0,
            v_unit_price, v_unit_price,
            '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
            FALSE, FALSE, FALSE, FALSE,
            FALSE, FALSE, TRUE,
            v_now, v_now, v_marker, v_marker
        )
        RETURNING id INTO v_settlement_id;

        v_batch_declare := v_station_count * v_qty_per_line;
        v_batch_cost := ROUND(v_import_cost * v_batch_declare, 3);

        -- Import batch A (NEW)
        v_batch_a_code := 'MC-SEED-' || v_compact || '-A';
        INSERT INTO import_batches (
            batch_code, draw_date, supplier_id, supplier_settlement_id, import_mode,
            invoice_evidence_url, ticket_list_image_urls,
            imported_by, imported_at, status,
            line_count, total_declare_quantity, total_declared_cost_value,
            total_imported_quantity, total_imported_cost_value,
            submitted_at, completed_at, note,
            created_at, updated_at, created_by, last_modified_by
        ) VALUES (
            v_batch_a_code, v_draw_date, v_supplier_id, v_settlement_id, 'IN_DAY',
            v_evidence_url, v_list_urls,
            v_actor_id, v_imported_at, 'IMPORTED',
            v_station_count, v_batch_declare, v_batch_cost,
            v_batch_declare, v_batch_cost,
            v_imported_at, v_completed_at,
            'MC_SEED batch A (NEW) for Minh Chính',
            v_now, v_now, v_marker, v_marker
        )
        RETURNING id INTO v_batch_a_id;

        -- Import batch B (SUPPLEMENTARY)
        v_batch_b_code := 'MC-SEED-' || v_compact || '-B';
        INSERT INTO import_batches (
            batch_code, draw_date, supplier_id, supplier_settlement_id, import_mode,
            invoice_evidence_url, ticket_list_image_urls,
            imported_by, imported_at, status,
            line_count, total_declare_quantity, total_declared_cost_value,
            total_imported_quantity, total_imported_cost_value,
            submitted_at, completed_at, note,
            created_at, updated_at, created_by, last_modified_by
        ) VALUES (
            v_batch_b_code, v_draw_date, v_supplier_id, v_settlement_id, 'IN_DAY',
            v_evidence_url, v_list_urls,
            v_actor_id, v_imported_at + interval '10 minutes', 'IMPORTED',
            v_station_count, v_batch_declare, v_batch_cost,
            v_batch_declare, v_batch_cost,
            v_imported_at + interval '10 minutes', v_completed_at + interval '10 minutes',
            'MC_SEED batch B (SUPPLEMENTARY) for Minh Chính',
            v_now, v_now, v_marker, v_marker
        )
        RETURNING id INTO v_batch_b_id;

        -- Return batch header
        v_rb_code := 'RB-MC-' || v_compact;
        INSERT INTO return_batches (
            batch_code, return_batch_type, lottery_supplier_id, draw_date,
            supplier_settlement_id, return_evidence_url, delivery_mode,
            total_quantity, total_return_value,
            returned_by, returned_at, confirmed_at, status, note,
            created_at, updated_at, created_by, last_modified_by
        ) VALUES (
            v_rb_code, 'SUPPLIER_RETURN', v_supplier_id, v_draw_date,
            v_settlement_id,
            CASE WHEN v_return_status = 'HANDED_OVER' THEN v_return_evidence ELSE NULL END,
            CASE WHEN v_return_status = 'HANDED_OVER' THEN 'RETAILER_DELIVERS' ELSE NULL END,
            0, 0,
            CASE WHEN v_return_status = 'HANDED_OVER' THEN v_actor_id ELSE NULL END,
            CASE WHEN v_return_status = 'HANDED_OVER'
                 THEN (v_draw_date::timestamp + v_return_cutoff) ELSE NULL END,
            CASE WHEN v_return_status = 'HANDED_OVER'
                 THEN (v_draw_date::timestamp + v_return_cutoff + interval '15 minutes') ELSE NULL END,
            v_return_status,
            'MC_SEED supplier return for Minh Chính',
            v_now, v_now, v_marker, v_marker
        )
        RETURNING id INTO v_return_id;

        FOREACH v_station_id IN ARRAY v_station_ids LOOP
            SELECT COALESCE(s.code, 'S' || s.id::text),
                   s.price,
                   COALESCE(s.commission_rate, 0.0500)
            INTO v_station_code, v_station_price, v_station_comm
            FROM lottery_stations s
            WHERE s.id = v_station_id;

            v_import_cost := ROUND(v_station_price * (1 - v_station_comm), 3);
            v_line_cost := ROUND(v_import_cost * v_qty_per_line, 3);

            v_line_a_code := 'LO-MC-' || v_compact || '-' || v_station_code || '-NEW';
            INSERT INTO import_batch_lines (
                import_batch_id, lottery_station_id, batch_type, batch_code,
                declare_quantity, declared_cost_value, total_quantity,
                import_cost, total_cost_value, status, imported_at,
                created_at, updated_at, created_by, last_modified_by
            ) VALUES (
                v_batch_a_id, v_station_id, 'NEW', v_line_a_code,
                v_qty_per_line, v_line_cost, v_qty_per_line,
                v_import_cost, v_line_cost, 'IMPORTED', v_completed_at,
                v_now, v_now, v_marker, v_marker
            )
            RETURNING id INTO v_line_a_id;

            v_line_b_code := 'LO-MC-' || v_compact || '-' || v_station_code || '-SUPP';
            INSERT INTO import_batch_lines (
                import_batch_id, lottery_station_id, batch_type, batch_code,
                declare_quantity, declared_cost_value, total_quantity,
                import_cost, total_cost_value, status, imported_at,
                created_at, updated_at, created_by, last_modified_by
            ) VALUES (
                v_batch_b_id, v_station_id, 'SUPPLEMENTARY', v_line_b_code,
                v_qty_per_line, v_line_cost, v_qty_per_line,
                v_import_cost, v_line_cost, 'IMPORTED', v_completed_at + interval '10 minutes',
                v_now, v_now, v_marker, v_marker
            )
            RETURNING id INTO v_line_b_id;

            INSERT INTO return_batch_lines (
                return_batch_id, lottery_station_id, status,
                total_quantity, total_return_value,
                created_at, updated_at, created_by, last_modified_by
            ) VALUES (
                v_return_id, v_station_id, v_line_status,
                0, 0,
                v_now, v_now, v_marker, v_marker
            )
            RETURNING id INTO v_return_line_id;

            -- 500 serials = 250 NEW + 250 SUPP (1 ticket : 1 serial)
            FOR v_i IN 1..(v_qty_per_line * 2) LOOP
                v_suffix := v_lucky[1 + ((v_i - 1) % cardinality(v_lucky))];
                v_prefix := (1000 + ((v_station_id::int * 97 + v_i * 13 + v_day_offset * 31) % 9000));
                v_numbers := lpad(v_prefix::text, 4, '0') || v_suffix;

                v_attempt := 0;
                WHILE EXISTS (
                    SELECT 1
                    FROM lottery_tickets t
                    WHERE t.station_id = v_station_id
                      AND t.numbers = v_numbers
                      AND t.draw_date = v_draw_date
                      AND t.deleted_at IS NULL
                ) AND v_attempt < 50 LOOP
                    v_attempt := v_attempt + 1;
                    v_prefix := (v_prefix + 1) % 10000;
                    v_numbers := lpad(v_prefix::text, 4, '0') || v_suffix;
                END LOOP;

                v_serial_status := v_serial_statuses[1 + ((v_i - 1) % cardinality(v_serial_statuses))];
                v_condition := v_conditions[1 + ((v_i - 1) % cardinality(v_conditions))];

                -- Past draw: prefer EXPIRED over IN_STOCK for unsold-looking mix
                IF v_day_offset < 0 AND v_serial_status = 'IN_STOCK' AND (v_i % 2 = 0) THEN
                    v_serial_status := 'EXPIRED';
                END IF;

                v_is_lucky := v_suffix IN ('68', '86', '88') AND (v_i % 5 = 0);

                IF v_serial_status = 'SOLD' THEN
                    v_ticket_status := 'SOLD_OUT';
                    v_ticket_active := FALSE;
                ELSIF v_day_offset < 0 AND v_serial_status = 'EXPIRED' THEN
                    v_ticket_status := 'EXPIRED';
                    v_ticket_active := FALSE;
                ELSIF v_serial_status IN ('IN_STOCK', 'RESERVED') AND v_condition = 'GOOD' THEN
                    v_ticket_status := 'IN_STOCK';
                    v_ticket_active := TRUE;
                ELSIF v_condition IN ('DAMAGED', 'LOST', 'VOIDED') THEN
                    v_ticket_status := CASE WHEN v_day_offset < 0 THEN 'EXPIRED' ELSE 'IN_STOCK' END;
                    v_ticket_active := FALSE;
                ELSE
                    v_ticket_status := 'IN_STOCK';
                    v_ticket_active := (v_serial_status = 'IN_STOCK' AND v_condition = 'GOOD');
                END IF;

                INSERT INTO lottery_tickets (
                    station_id, numbers, draw_date, price_snapshot, status, is_active,
                    batch_code, created_at, updated_at, created_by, last_modified_by
                ) VALUES (
                    v_station_id, v_numbers, v_draw_date, v_station_price,
                    v_ticket_status, v_ticket_active,
                    CASE WHEN v_i <= v_qty_per_line THEN v_line_a_code ELSE v_line_b_code END,
                    v_now, v_now, v_marker, v_marker
                )
                RETURNING id INTO v_ticket_id;

                v_serial := lower(
                    'mc' || to_char(v_draw_date, 'YYMMDD')
                    || v_station_code
                    || lpad(v_i::text, 3, '0')
                    || substr(md5(v_station_id::text || ':' || v_draw_date::text || ':' || v_i::text), 1, 5)
                );
                -- keep a-z0-9 only
                v_serial := regexp_replace(v_serial, '[^a-z0-9]', '', 'g');

                INSERT INTO lottery_ticket_serials (
                    ticket_id, import_batch_id, import_batch_line_id,
                    serial_number, status, ticket_condition, payout_state, input_source,
                    station_id, draw_date, imported_by, imported_at, is_verified,
                    is_lucky, lucky_badges,
                    created_at, updated_at, created_by, last_modified_by
                ) VALUES (
                    v_ticket_id,
                    CASE WHEN v_i <= v_qty_per_line THEN v_batch_a_id ELSE v_batch_b_id END,
                    CASE WHEN v_i <= v_qty_per_line THEN v_line_a_id ELSE v_line_b_id END,
                    v_serial, v_serial_status, v_condition, 'NONE', 'MANUAL',
                    v_station_id, v_draw_date, v_actor_id, v_imported_at, TRUE,
                    v_is_lucky,
                    CASE WHEN v_is_lucky THEN '["Đuôi ' || v_suffix || '"]' ELSE NULL END,
                    v_now, v_now, v_marker, v_marker
                );
            END LOOP;

            UPDATE lottery_stations
            SET inventory_count = COALESCE(inventory_count, 0) + (v_qty_per_line * 2),
                updated_at = v_now,
                last_modified_by = v_marker
            WHERE id = v_station_id;

            -- Attach returnable serials (GOOD + IN_STOCK/EXPIRED)
            IF v_attach_returns THEN
                SELECT COALESCE(array_agg(x.id ORDER BY x.id), ARRAY[]::bigint[])
                INTO v_eligible_ids
                FROM (
                    SELECT s.id
                    FROM lottery_ticket_serials s
                    WHERE s.station_id = v_station_id
                      AND s.draw_date = v_draw_date
                      AND s.deleted_at IS NULL
                      AND s.ticket_condition = 'GOOD'
                      AND s.status IN ('IN_STOCK', 'EXPIRED')
                      AND s.return_batch_line_id IS NULL
                      AND s.import_batch_id IN (v_batch_a_id, v_batch_b_id)
                    ORDER BY s.id
                ) x;

                v_attach_n := GREATEST(1, COALESCE(cardinality(v_eligible_ids), 0) / 5);
                IF cardinality(v_eligible_ids) > 0 THEN
                    FOR v_i IN 1..LEAST(v_attach_n, cardinality(v_eligible_ids)) LOOP
                        v_attach_id := v_eligible_ids[v_i];
                        UPDATE lottery_ticket_serials
                        SET return_batch_line_id = v_return_line_id,
                            returned_at = (v_draw_date::timestamp + v_return_cutoff),
                            updated_at = v_now,
                            last_modified_by = v_marker
                        WHERE id = v_attach_id;
                    END LOOP;

                    UPDATE return_batch_lines rbl
                    SET total_quantity = sub.cnt,
                        total_return_value = ROUND(sub.cnt * v_import_cost, 3),
                        updated_at = v_now,
                        last_modified_by = v_marker
                    FROM (
                        SELECT COUNT(*)::int AS cnt
                        FROM lottery_ticket_serials
                        WHERE return_batch_line_id = v_return_line_id
                          AND deleted_at IS NULL
                    ) sub
                    WHERE rbl.id = v_return_line_id;
                END IF;
            END IF;
        END LOOP;

        -- Roll up return batch totals
        UPDATE return_batches rb
        SET total_quantity = COALESCE(sub.qty, 0),
            total_return_value = COALESCE(sub.val, 0),
            updated_at = v_now,
            last_modified_by = v_marker
        FROM (
            SELECT SUM(total_quantity)::int AS qty,
                   SUM(total_return_value) AS val
            FROM return_batch_lines
            WHERE return_batch_id = v_return_id
              AND deleted_at IS NULL
        ) sub
        WHERE rb.id = v_return_id;

        -- Settlement system figures
        SELECT COUNT(*)::int,
               ROUND(COUNT(*) * v_unit_price, 3)
        INTO v_sys_import_qty, v_sys_import_val
        FROM lottery_ticket_serials
        WHERE import_batch_id IN (v_batch_a_id, v_batch_b_id)
          AND deleted_at IS NULL;

        SELECT COUNT(*)::int,
               ROUND(COUNT(*) * v_unit_price, 3)
        INTO v_sys_return_qty, v_sys_return_val
        FROM lottery_ticket_serials s
        JOIN return_batch_lines rbl ON rbl.id = s.return_batch_line_id
        JOIN return_batches rb ON rb.id = rbl.return_batch_id
        WHERE rb.id = v_return_id
          AND s.deleted_at IS NULL
          AND s.ticket_condition = 'GOOD'
          AND s.status IN ('IN_STOCK', 'EXPIRED')
          AND rb.status IN ('HANDED_OVER', 'RECEIVED');

        v_sys_return_qty := COALESCE(v_sys_return_qty, 0);
        v_sys_return_val := COALESCE(v_sys_return_val, 0);
        v_remaining := v_sys_import_val - v_sys_return_val;
        IF v_remaining < 0 THEN
            v_remaining := 0;
        END IF;

        IF v_day_offset < 0 THEN
            v_paid := v_remaining;
            UPDATE supplier_settlements
            SET total_import_value = v_sys_import_val,
                total_return_value = v_sys_return_val,
                total_paid_amount = v_paid,
                remaining_amount = 0,
                system_import_quantity = v_sys_import_qty,
                system_import_value = v_sys_import_val,
                system_return_quantity = v_sys_return_qty,
                system_return_value = v_sys_return_val,
                actual_ticket_import_quantity = v_sys_import_qty,
                actual_ticket_import_value = v_sys_import_val,
                actual_return_ticket_quantity = v_sys_return_qty,
                actual_return_ticket_value = v_sys_return_val,
                initial_estimated_settlement_value = v_sys_import_val - v_sys_return_val,
                final_settlement_value = v_paid,
                actual_paid_amount = v_paid,
                settlement_difference_amount = 0,
                recalculated_total_paid_amount = v_paid,
                payment_evidence_urls = v_payment_urls,
                supplier_settlement_receipt_url = 'https://seed.local/mc/settlement-receipt.png',
                matching_confirmed_at = (v_draw_date::timestamp + v_payment_cutoff - interval '30 minutes'),
                matching_confirmed_by = v_actor_id,
                completed_at = (v_draw_date::timestamp + v_payment_cutoff),
                completed_by = v_actor_id,
                paid_at = (v_draw_date::timestamp + v_payment_cutoff),
                status = 'CLOSED',
                reconciliation_phase = 'COMPLETED',
                is_return_expired = TRUE,
                reconciliation_note = 'MC_SEED completed settlement for Minh Chính',
                updated_at = v_now,
                last_modified_by = v_marker
            WHERE id = v_settlement_id;
        ELSE
            UPDATE supplier_settlements
            SET total_import_value = v_sys_import_val,
                total_return_value = v_sys_return_val,
                total_paid_amount = 0,
                remaining_amount = v_remaining,
                system_import_quantity = v_sys_import_qty,
                system_import_value = v_sys_import_val,
                system_return_quantity = v_sys_return_qty,
                system_return_value = v_sys_return_val,
                initial_estimated_settlement_value = v_remaining,
                status = v_settlement_status,
                reconciliation_phase = v_recon_phase,
                is_return_expired = v_is_return_expired,
                reconciliation_note = 'MC_SEED open settlement for Minh Chính',
                updated_at = v_now,
                last_modified_by = v_marker
            WHERE id = v_settlement_id;
        END IF;

        RAISE NOTICE
            'MC_SEED: seeded draw_date=% stations=% import_qty=% return_qty=% return_status=% settlement=%/%',
            v_draw_date, v_station_count, v_sys_import_qty, v_sys_return_qty,
            v_return_status, v_settlement_status, v_recon_phase;
    END LOOP;

    RAISE NOTICE 'MC_SEED: Minh Chính demo seed finished for window % .. %',
        v_today - 1, v_today + 1;
END $$;
