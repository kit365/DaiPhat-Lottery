-- Migration: Create staff_invites table
-- Module: Account Service

CREATE TABLE IF NOT EXISTS staff_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(100) NOT NULL UNIQUE,
    role_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by_id UUID,
    invited_at TIMESTAMP,
    approved_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM',
    CONSTRAINT fk_staff_invites_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

-- Add index for performance on common lookups
CREATE INDEX IF NOT EXISTS idx_staff_invites_email_status ON staff_invites(email, status);
CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON staff_invites(token);
