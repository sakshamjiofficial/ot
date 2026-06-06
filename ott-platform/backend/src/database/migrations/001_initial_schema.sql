-- =============================================================
-- OTT PLATFORM — INITIAL SCHEMA MIGRATION
-- Version: 001
-- Run: psql -U ott_user -d ott_db -f 001_initial_schema.sql
-- =============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================
-- ENUMS
-- =============================================================

DO $$ BEGIN
  CREATE TYPE user_role           AS ENUM ('user', 'admin', 'superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_type        AS ENUM ('movie', 'series');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_status      AS ENUM ('draft','processing','published','scheduled','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE job_status          AS ENUM ('pending','processing','completed','failed','retrying');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan   AS ENUM ('free','basic','premium','family');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active','expired','cancelled','trial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status      AS ENUM ('pending','success','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE device_type         AS ENUM ('android','ios','web','tv');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resolution          AS ENUM ('360p','480p','720p','1080p');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================
-- USERS
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    phone               VARCHAR(20),
    password_hash       TEXT NOT NULL,
    display_name        VARCHAR(100),
    avatar_url          TEXT,
    role                user_role DEFAULT 'user',
    is_active           BOOLEAN DEFAULT true,
    is_email_verified   BOOLEAN DEFAULT false,
    email_verified_at   TIMESTAMPTZ,
    fcm_token           TEXT,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- =============================================================
-- DEVICES
-- =============================================================

CREATE TABLE IF NOT EXISTS devices (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type         device_type NOT NULL,
    device_name         VARCHAR(150),
    device_fingerprint  VARCHAR(255) UNIQUE NOT NULL,
    ip_address          INET,
    user_agent          TEXT,
    refresh_token_hash  TEXT,
    last_seen_at        TIMESTAMPTZ DEFAULT NOW(),
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id       ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint   ON devices(device_fingerprint);

-- =============================================================
-- GENRES
-- =============================================================

CREATE TABLE IF NOT EXISTS genres (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    icon_url    TEXT,
    sort_order  INT DEFAULT 0
);

-- =============================================================
-- PEOPLE (actors, directors)
-- =============================================================

CREATE TABLE IF NOT EXISTS people (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(200) UNIQUE NOT NULL,
    bio         TEXT,
    photo_url   TEXT,
    birth_date  DATE,
    nationality VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_people_name ON people USING gin(to_tsvector('english', name));

-- =============================================================
-- CONTENT
-- =============================================================

CREATE TABLE IF NOT EXISTS content (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type                content_type NOT NULL,
    title               VARCHAR(500) NOT NULL,
    slug                VARCHAR(500) UNIQUE NOT NULL,
    description         TEXT,
    short_description   VARCHAR(300),
    language            VARCHAR(10) DEFAULT 'en',
    release_year        SMALLINT,
    duration_seconds    INT,
    age_rating          VARCHAR(10),
    status              content_status DEFAULT 'draft',
    is_premium          BOOLEAN DEFAULT false,
    is_featured         BOOLEAN DEFAULT false,
    is_trending         BOOLEAN DEFAULT false,
    imdb_rating         NUMERIC(3,1),
    trailer_url         TEXT,
    poster_url          TEXT,
    banner_url          TEXT,
    thumbnail_url       TEXT,
    search_vector       TSVECTOR,
    total_plays         BIGINT DEFAULT 0,
    total_watch_seconds BIGINT DEFAULT 0,
    scheduled_at        TIMESTAMPTZ,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_content_type      ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_status    ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_search    ON content USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_content_trgm      ON content USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_content_premium   ON content(is_premium);
CREATE INDEX IF NOT EXISTS idx_content_trending  ON content(is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_content_published ON content(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_content_plays     ON content(total_plays DESC);

-- Auto search_vector
CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_search_vector ON content;
CREATE TRIGGER trg_content_search_vector
    BEFORE INSERT OR UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_content_search_vector();

-- Auto updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_updated_at ON content;
CREATE TRIGGER trg_content_updated_at
    BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- CONTENT ↔ GENRES (M:M)
-- =============================================================

CREATE TABLE IF NOT EXISTS content_genres (
    content_id  UUID REFERENCES content(id) ON DELETE CASCADE,
    genre_id    INT  REFERENCES genres(id)  ON DELETE CASCADE,
    PRIMARY KEY (content_id, genre_id)
);

-- =============================================================
-- CONTENT ↔ PEOPLE (M:M)
-- =============================================================

CREATE TABLE IF NOT EXISTS content_people (
    content_id  UUID REFERENCES content(id) ON DELETE CASCADE,
    person_id   UUID REFERENCES people(id)  ON DELETE CASCADE,
    role        VARCHAR(50) DEFAULT 'actor',
    character   VARCHAR(200),
    sort_order  INT DEFAULT 0,
    PRIMARY KEY (content_id, person_id, role)
);

-- =============================================================
-- SEASONS
-- =============================================================

CREATE TABLE IF NOT EXISTS seasons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id      UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    season_number   SMALLINT NOT NULL,
    title           VARCHAR(300),
    description     TEXT,
    poster_url      TEXT,
    release_year    SMALLINT,
    total_episodes  SMALLINT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_id, season_number)
);

CREATE INDEX IF NOT EXISTS idx_seasons_content ON seasons(content_id);

-- =============================================================
-- EPISODES
-- =============================================================

CREATE TABLE IF NOT EXISTS episodes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id          UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    season_id           UUID REFERENCES seasons(id) ON DELETE SET NULL,
    episode_number      SMALLINT NOT NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    duration_seconds    INT,
    thumbnail_url       TEXT,
    status              content_status DEFAULT 'draft',
    is_premium          BOOLEAN DEFAULT false,
    intro_start_sec     INT,
    intro_end_sec       INT,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_episodes_content ON episodes(content_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season  ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_status  ON episodes(status);

-- =============================================================
-- VIDEO ASSETS
-- =============================================================

CREATE TABLE IF NOT EXISTS video_assets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id          UUID REFERENCES content(id) ON DELETE CASCADE,
    episode_id          UUID REFERENCES episodes(id) ON DELETE CASCADE,
    r2_base_path        TEXT NOT NULL,
    master_url          TEXT,
    duration_seconds    INT,
    file_size_bytes     BIGINT,
    original_filename   TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_asset_parent CHECK (content_id IS NOT NULL OR episode_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_video_assets_content ON video_assets(content_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_episode ON video_assets(episode_id);

-- =============================================================
-- VIDEO RENDITIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS video_renditions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_asset_id  UUID NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
    resolution      resolution NOT NULL,
    bitrate_kbps    INT,
    playlist_url    TEXT NOT NULL,
    file_size_bytes BIGINT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renditions_asset ON video_renditions(video_asset_id);

-- =============================================================
-- SUBTITLES
-- =============================================================

CREATE TABLE IF NOT EXISTS subtitles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_asset_id  UUID NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
    language_code   VARCHAR(10) NOT NULL,
    language_name   VARCHAR(100),
    vtt_url         TEXT NOT NULL,
    format          VARCHAR(10) DEFAULT 'vtt',
    is_default      BOOLEAN DEFAULT false
);

-- =============================================================
-- AUDIO TRACKS
-- =============================================================

CREATE TABLE IF NOT EXISTS audio_tracks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_asset_id  UUID NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
    language_code   VARCHAR(10) NOT NULL,
    language_name   VARCHAR(100),
    is_default      BOOLEAN DEFAULT false,
    codec           VARCHAR(20) DEFAULT 'aac'
);

-- =============================================================
-- THUMBNAIL SPRITES
-- =============================================================

CREATE TABLE IF NOT EXISTS thumbnail_sprites (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_asset_id  UUID NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
    sprite_url      TEXT NOT NULL,
    vtt_url         TEXT,
    tile_width      INT,
    tile_height     INT,
    interval_sec    INT DEFAULT 10,
    columns         INT,
    rows            INT
);

-- =============================================================
-- TRANSCODING JOBS
-- =============================================================

CREATE TABLE IF NOT EXISTS transcoding_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_asset_id  UUID NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
    bullmq_job_id   VARCHAR(100),
    status          job_status DEFAULT 'pending',
    priority        SMALLINT DEFAULT 5,
    progress        SMALLINT DEFAULT 0,
    error_message   TEXT,
    retry_count     SMALLINT DEFAULT 0,
    max_retries     SMALLINT DEFAULT 3,
    worker_id       VARCHAR(100),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcode_status ON transcoding_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcode_asset  ON transcoding_jobs(video_asset_id);

DROP TRIGGER IF EXISTS trg_transcode_updated_at ON transcoding_jobs;
CREATE TRIGGER trg_transcode_updated_at
    BEFORE UPDATE ON transcoding_jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- SUBSCRIPTION PLANS
-- =============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    plan_type       subscription_plan NOT NULL,
    price_inr       NUMERIC(10,2) NOT NULL,
    duration_days   INT NOT NULL,
    max_devices     SMALLINT DEFAULT 1,
    max_quality     resolution DEFAULT '1080p',
    features        JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT true,
    razorpay_plan_id VARCHAR(100)
);

-- =============================================================
-- SUBSCRIPTIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id         INT NOT NULL REFERENCES subscription_plans(id),
    status          subscription_status DEFAULT 'trial',
    starts_at       TIMESTAMPTZ NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    auto_renew      BOOLEAN DEFAULT true,
    razorpay_sub_id VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user    ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);

-- =============================================================
-- PAYMENTS
-- =============================================================

CREATE TABLE IF NOT EXISTS payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id),
    subscription_id     UUID REFERENCES subscriptions(id),
    razorpay_order_id   VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    amount_inr          NUMERIC(10,2) NOT NULL,
    status              payment_status DEFAULT 'pending',
    payment_method      VARCHAR(50),
    invoice_url         TEXT,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- COUPONS
-- =============================================================

CREATE TABLE IF NOT EXISTS coupons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) UNIQUE NOT NULL,
    discount_type   VARCHAR(10) NOT NULL,
    discount_value  NUMERIC(10,2) NOT NULL,
    max_uses        INT,
    used_count      INT DEFAULT 0,
    plan_id         INT REFERENCES subscription_plans(id),
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- WATCH HISTORY
-- =============================================================

CREATE TABLE IF NOT EXISTS watch_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id      UUID REFERENCES content(id) ON DELETE CASCADE,
    episode_id      UUID REFERENCES episodes(id) ON DELETE CASCADE,
    device_id       UUID REFERENCES devices(id),
    watched_seconds INT DEFAULT 0,
    total_seconds   INT,
    completed       BOOLEAN DEFAULT false,
    last_watched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, episode_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_history_user   ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_content ON watch_history(content_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_recent  ON watch_history(user_id, last_watched_at DESC);

-- =============================================================
-- WATCHLIST
-- =============================================================

CREATE TABLE IF NOT EXISTS watchlist (
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    content_id  UUID REFERENCES content(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);

-- =============================================================
-- RECOMMENDATIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS recommendations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    content_id  UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    score       NUMERIC(5,4),
    reason      VARCHAR(50),
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reco_user ON recommendations(user_id, score DESC);

-- =============================================================
-- BANNERS
-- =============================================================

CREATE TABLE IF NOT EXISTS banners (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(300),
    image_url   TEXT NOT NULL,
    link_type   VARCHAR(20),
    link_value  VARCHAR(300),
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    starts_at   TIMESTAMPTZ,
    ends_at     TIMESTAMPTZ
);

-- =============================================================
-- HOME SECTIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS home_sections (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    section_type VARCHAR(50) NOT NULL,
    query_config JSONB,
    sort_order   INT DEFAULT 0,
    is_active    BOOLEAN DEFAULT true
);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(300) NOT NULL,
    body         TEXT,
    type         VARCHAR(50),
    data         JSONB DEFAULT '{}',
    is_read      BOOLEAN DEFAULT false,
    sent_via_fcm BOOLEAN DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user   ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id) WHERE is_read = false;

-- =============================================================
-- SEARCH QUERIES (analytics)
-- =============================================================

CREATE TABLE IF NOT EXISTS search_queries (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query        VARCHAR(500) NOT NULL,
    user_id      UUID REFERENCES users(id),
    result_count INT,
    clicked_id   UUID,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_trgm ON search_queries USING gin(query gin_trgm_ops);

-- =============================================================
-- APP CONFIG
-- =============================================================

CREATE TABLE IF NOT EXISTS app_config (
    key         VARCHAR(200) PRIMARY KEY,
    value       TEXT,
    description TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (key, value, description) VALUES
    ('min_android_version', '1.0.0',  'Minimum Android app version (force update)'),
    ('maintenance_mode',    'false',  'Global maintenance mode toggle'),
    ('free_trial_days',     '7',      'New user free trial duration in days'),
    ('max_devices_per_user','3',      'Maximum concurrent device sessions per user'),
    ('hls_token_ttl_seconds','3600',  'Signed HLS URL expiry in seconds'),
    ('max_concurrent_streams','3',    'Max simultaneous streams per subscription'),
    ('default_quality',     '720p',   'Default playback quality for new users')
ON CONFLICT (key) DO NOTHING;

-- =============================================================
-- SEED DATA — Subscription Plans
-- =============================================================

INSERT INTO subscription_plans
    (name, plan_type, price_inr, duration_days, max_devices, max_quality, features)
VALUES
    ('Free',    'free',    0,      0,   1, '480p',  '{"ads": true, "downloads": false}'),
    ('Basic',   'basic',   99,     30,  2, '720p',  '{"ads": false, "downloads": true, "max_download_quality": "480p"}'),
    ('Premium', 'premium', 199,    30,  4, '1080p', '{"ads": false, "downloads": true, "max_download_quality": "1080p", "multi_audio": true}'),
    ('Family',  'family',  299,    30,  6, '1080p', '{"ads": false, "downloads": true, "max_download_quality": "1080p", "multi_audio": true, "profiles": 6}')
ON CONFLICT DO NOTHING;

-- =============================================================
-- SEED DATA — Genres
-- =============================================================

INSERT INTO genres (name, slug, sort_order) VALUES
    ('Action',      'action',       1),
    ('Comedy',      'comedy',       2),
    ('Drama',       'drama',        3),
    ('Thriller',    'thriller',     4),
    ('Romance',     'romance',      5),
    ('Horror',      'horror',       6),
    ('Sci-Fi',      'sci-fi',       7),
    ('Documentary', 'documentary',  8),
    ('Animation',   'animation',    9),
    ('Crime',       'crime',       10),
    ('Family',      'family',      11),
    ('Fantasy',     'fantasy',     12),
    ('Biography',   'biography',   13),
    ('Sports',      'sports',      14),
    ('Mystery',     'mystery',     15)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================
-- SEED DATA — Home Sections
-- =============================================================

INSERT INTO home_sections (title, section_type, sort_order, query_config) VALUES
    ('Featured',          'featured',         1, '{"limit": 5}'),
    ('Trending Now',      'trending',         2, '{"limit": 20}'),
    ('Continue Watching', 'continue_watching',3, '{"limit": 10}'),
    ('New Releases',      'recently_added',   4, '{"limit": 20}'),
    ('Action Movies',     'genre',            5, '{"genre_slug": "action", "limit": 20}'),
    ('Web Series',        'series',           6, '{"limit": 20}'),
    ('Hindi Dubbed',      'language',         7, '{"language": "hi", "limit": 20}'),
    ('Top Rated',         'top_rated',        8, '{"min_rating": 7.5, "limit": 20}')
ON CONFLICT DO NOTHING;

-- Done
SELECT 'Schema migration 001 completed successfully' AS result;
