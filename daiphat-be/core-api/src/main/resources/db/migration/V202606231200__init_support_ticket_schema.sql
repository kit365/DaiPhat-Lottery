CREATE TABLE IF NOT EXISTS ticket_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    priority INT NOT NULL DEFAULT 2,
    required_ref_type VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT uk_ticket_categories_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_category_id BIGINT NOT NULL,
    customer_id UUID NOT NULL,
    assigned_to UUID,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    attachment_url VARCHAR(500),
    ref_id VARCHAR(100),
    ref_type VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    response TEXT,
    resolved_at TIMESTAMP,
    due_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT fk_support_tickets_category FOREIGN KEY (ticket_category_id) REFERENCES ticket_categories (id),
    CONSTRAINT fk_support_tickets_customer FOREIGN KEY (customer_id) REFERENCES users (id),
    CONSTRAINT fk_support_tickets_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets (customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category_id ON support_tickets (ticket_category_id);

CREATE TABLE IF NOT EXISTS support_ticket_comments (
    id BIGSERIAL PRIMARY KEY,
    support_ticket_id BIGINT NOT NULL,
    sender_id UUID,
    sender_role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    attachment_url VARCHAR(500),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT fk_support_ticket_comments_ticket FOREIGN KEY (support_ticket_id) REFERENCES support_tickets (id),
    CONSTRAINT fk_support_ticket_comments_sender FOREIGN KEY (sender_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket_created
    ON support_ticket_comments (support_ticket_id, created_at);
