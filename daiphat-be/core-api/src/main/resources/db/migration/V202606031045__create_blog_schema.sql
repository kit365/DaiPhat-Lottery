CREATE TABLE IF NOT EXISTS blog_category (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM',
    CONSTRAINT fk_blog_category_parent FOREIGN KEY (parent_id) REFERENCES blog_category(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blog_tag (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM'
);

CREATE TABLE IF NOT EXISTS blog_post (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    summary VARCHAR(500),
    content TEXT,
    thumbnail VARCHAR(255),
    scheduled_at TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    view_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM',
    CONSTRAINT fk_blog_post_category FOREIGN KEY (category_id) REFERENCES blog_category(id)
);

CREATE TABLE IF NOT EXISTS blog_tag_map (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    CONSTRAINT fk_blog_tag_map_post FOREIGN KEY (post_id) REFERENCES blog_post(id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_tag_map_tag FOREIGN KEY (tag_id) REFERENCES blog_tag(id) ON DELETE CASCADE,
    CONSTRAINT uq_blog_tag_map UNIQUE (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_category_id ON blog_post(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_tag_map_post_id ON blog_tag_map(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_tag_map_tag_id ON blog_tag_map(tag_id);
