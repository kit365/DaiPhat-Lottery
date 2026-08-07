CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    customer_id UUID NOT NULL,
    assigned_operator_id UUID,
    last_assigned_operator_id UUID,
    customer_last_read_at TIMESTAMP,
    operator_last_read_at TIMESTAMP,
    last_message_from VARCHAR(20),
    last_message_at TIMESTAMP,
    closed_by UUID,
    close_reason VARCHAR(30),
    close_note TEXT,
    auto_close_warning_sent_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_conversations_customer
        FOREIGN KEY (customer_id) REFERENCES users (id),
    CONSTRAINT fk_conversations_assigned_operator
        FOREIGN KEY (assigned_operator_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_status
    ON conversations (status);

CREATE INDEX IF NOT EXISTS idx_conversations_customer_id
    ON conversations (customer_id);

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_operator_id
    ON conversations (assigned_operator_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
    ON conversations (last_message_at);

CREATE INDEX IF NOT EXISTS idx_conversations_customer_created
    ON conversations (customer_id, created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages (conversation_id, created_at ASC, id ASC);
