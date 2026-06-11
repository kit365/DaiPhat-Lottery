-- Comprehensive fix: Add deleted_at to ALL tables that inherit from BaseEntity
-- This fixes the schema inconsistency where entity has deletedAt but DB table doesn't have deleted_at column

-- Add to roles table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'deleted_at') THEN
        ALTER TABLE roles ADD COLUMN deleted_at TIMESTAMP NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON roles(deleted_at);

-- Add to permissions table (if not already added by previous migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'deleted_at') THEN
        ALTER TABLE permissions ADD COLUMN deleted_at TIMESTAMP NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_permissions_deleted_at ON permissions(deleted_at);

-- Add to users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at') THEN
        ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Add to staff_invites table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_invites' AND column_name = 'deleted_at') THEN
        ALTER TABLE staff_invites ADD COLUMN deleted_at TIMESTAMP NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_staff_invites_deleted_at ON staff_invites(deleted_at);

-- Add to blog_category table (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_category' AND column_name = 'deleted_at') THEN
        ALTER TABLE blog_category ADD COLUMN deleted_at TIMESTAMP NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_blog_category_deleted_at ON blog_category(deleted_at);

-- Add to blog_post table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_post' AND column_name = 'deleted_at') THEN
        ALTER TABLE blog_post ADD COLUMN deleted_at TIMESTAMP NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_blog_post_deleted_at ON blog_post(deleted_at);

-- Add to lottery_products table (if already exists from lottery schema migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lottery_products' AND column_name = 'deleted_at') THEN
        ALTER TABLE lottery_products ADD COLUMN deleted_at TIMESTAMP NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_lottery_products_deleted_at ON lottery_products(deleted_at);

-- Add to lottery_tickets table (if already exists from lottery schema migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lottery_tickets' AND column_name = 'deleted_at') THEN
        ALTER TABLE lottery_tickets ADD COLUMN deleted_at TIMESTAMP NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_deleted_at ON lottery_tickets(deleted_at);


