CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_status
    ON conversations (status);

CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    parent_id BIGINT,
    sender_id UUID,
    sender_type VARCHAR(30) NOT NULL,
    content TEXT,
    intent VARCHAR(100),
    confidence NUMERIC(5, 4),
    type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    reader_count INT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations (id),
    CONSTRAINT fk_messages_parent
        FOREIGN KEY (parent_id) REFERENCES messages (id),
    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_id) REFERENCES users (id),
    CONSTRAINT chk_messages_confidence
        CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
    ON messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
    ON messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_parent_id
    ON messages (parent_id);

CREATE TABLE IF NOT EXISTS participations (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    last_read_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assignee_type VARCHAR(30),
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_participations_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations (id),
    CONSTRAINT fk_participations_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_participations_conversation_user_role
        UNIQUE (conversation_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_participations_conversation_id
    ON participations (conversation_id);

CREATE INDEX IF NOT EXISTS idx_participations_user_id
    ON participations (user_id);
