-- Audit when staff/admin opens another operator's previous session transcript.
CREATE TABLE IF NOT EXISTS chat_previous_session_views (
    id BIGSERIAL PRIMARY KEY,
    viewer_id UUID NOT NULL,
    current_conversation_id BIGINT NOT NULL,
    previous_conversation_id BIGINT NOT NULL,
    viewed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_previous_session_views_viewer
    ON chat_previous_session_views (viewer_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_previous_session_views_current
    ON chat_previous_session_views (current_conversation_id);
