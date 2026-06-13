-- Migration 003: Add feature poster and feature text image URLs to content table
-- Run: docker compose exec -T postgres psql -U ott_user -d ott_db < backend/src/database/migrations/003_feature_media_urls.sql

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS feature_poster_url    TEXT,
  ADD COLUMN IF NOT EXISTS feature_text_image_url TEXT;

COMMENT ON COLUMN content.feature_poster_url     IS 'Large hero/feature poster image URL (used in featured content banners, typically wide 21:9 or 16:9 artwork)';
COMMENT ON COLUMN content.feature_text_image_url IS 'Title treatment / logo text image URL (transparent PNG of the content title in stylized form)';
