-- Local/prod drift: V202607311100 may be marked applied while
-- supplier_settlement_code_seq was never created (CREATE SEQUENCE skipped /
-- partial apply). Scheduler ReturnBatchAutoGenerationService needs nextval().

CREATE SEQUENCE IF NOT EXISTS supplier_settlement_code_seq START WITH 1 INCREMENT BY 1;

-- Also ensure return-batch header code sequence exists (same migration era).
CREATE SEQUENCE IF NOT EXISTS return_batch_header_code_seq START WITH 1 INCREMENT BY 1;

-- Align sequence past any existing DS-YYYYMMDD-NNNN codes to avoid unique collisions.
SELECT setval(
    'supplier_settlement_code_seq',
    GREATEST(
        1,
        (
            SELECT COALESCE(
                MAX(NULLIF(regexp_replace(supplier_settlement_code, '^DS-[0-9]{8}-', ''), '')::bigint),
                0
            )
            FROM supplier_settlements
            WHERE supplier_settlement_code ~ '^DS-[0-9]{8}-[0-9]+$'
        )
    ),
    true
);
