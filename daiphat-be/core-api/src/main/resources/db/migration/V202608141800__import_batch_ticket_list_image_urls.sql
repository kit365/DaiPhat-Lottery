ALTER TABLE import_batches
    ADD COLUMN IF NOT EXISTS ticket_list_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
