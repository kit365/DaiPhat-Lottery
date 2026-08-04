-- Soft-delete column required by BaseEntity mapping on FortuneCastEntity.
ALTER TABLE fortune_casts
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
