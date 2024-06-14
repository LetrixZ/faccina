CREATE TABLE archives
(
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(1024) UNIQUE NOT NULL,
  title VARCHAR(1024) NOT NULL,
  description TEXT NULL,
  path TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL UNIQUE,
  pages SMALLINT NOT NULL,
  size BIGINT NOT NULL,
  thumbnail SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX slug_idx ON archives (slug);
CREATE INDEX title_idx ON archives (title);
CREATE INDEX path_idx ON archives (path);
CREATE INDEX pages_idx ON archives (pages);
CREATE INDEX deleted_at_idx ON archives (deleted_at);

CREATE TABLE artists
(
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  slug VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE circles
(
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  slug VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE magazines
(
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  slug VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE parodies
(
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  slug VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE tags
(
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  slug VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE archive_artists
(
  archive_id BIGINT REFERENCES archives(id) ON DELETE CASCADE,
  artist_id BIGINT REFERENCES artists(id) ON DELETE CASCADE,
  PRIMARY KEY(archive_id, artist_id)
);

CREATE INDEX archive_artists_archive_id_idx ON archive_artists (archive_id);
CREATE INDEX archive_artists_artist_id_idx ON archive_artists (artist_id);

CREATE TABLE archive_circles
(
  archive_id BIGINT REFERENCES archives(id) ON DELETE CASCADE,
  circle_id BIGINT REFERENCES circles(id) ON DELETE CASCADE,
  PRIMARY KEY(archive_id, circle_id)
);

CREATE INDEX archive_circles_archive_id_idx ON archive_circles (archive_id);
CREATE INDEX archive_circles_circle_id_idx ON archive_circles (circle_id);

CREATE TABLE archive_magazines
(
  archive_id BIGINT REFERENCES archives(id) ON DELETE CASCADE,
  magazine_id BIGINT REFERENCES magazines(id) ON DELETE CASCADE,
  PRIMARY KEY(archive_id, magazine_id)
);

CREATE INDEX archive_magazines_archive_id_idx ON archive_magazines (archive_id);
CREATE INDEX archive_magazines_magazine_id_idx ON archive_magazines (magazine_id);

CREATE TABLE archive_parodies
(
  archive_id BIGINT REFERENCES archives(id) ON DELETE CASCADE,
  parody_id BIGINT REFERENCES parodies(id) ON DELETE CASCADE,
  PRIMARY KEY(archive_id, parody_id)
);

CREATE INDEX archive_parodies_archive_id_idx ON archive_parodies (archive_id);
CREATE INDEX archive_parodies_parody_id_idx ON archive_parodies (parody_id);

CREATE TABLE archive_tags
(
  archive_id BIGINT REFERENCES archives(id) ON DELETE CASCADE,
  tag_id BIGINT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(archive_id, tag_id)
);

CREATE INDEX archive_tags_archive_id_idx ON archive_tags (archive_id);
CREATE INDEX archive_tags_tag_id_idx ON archive_tags (tag_id);

CREATE TABLE archive_sources
(
  archive_id BIGINT REFERENCES archives(id) ON DELETE CASCADE,
  name VARCHAR(256) NOT NULL,
  url VARCHAR(1024),
  PRIMARY KEY(archive_id, name)
);

CREATE TABLE archive_images
(
  archive_id BIGINT REFERENCES archives(id) ON DELETE CASCADE,
  filename VARCHAR(1024) NOT NULL,
  page_number SMALLINT NOT NULL,
  width SMALLINT NOT NULL,
  height SMALLINT NOT NULL,
  PRIMARY KEY(archive_id, page_number)
);

-- It works

CREATE EXTENSION IF NOT EXISTS pg_trgm;
SET pg_trgm.similarity_threshold = 0.075;

CREATE TABLE archive_fts (
  archive_id INT PRIMARY KEY REFERENCES archives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', title), 'A')) STORED,
  artists TEXT NOT NULL,
  artists_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', artists), 'B')) STORED,
  circles TEXT NOT NULL,
  circles_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', circles), 'C')) STORED,
  magazines TEXT NOT NULL,
  magazines_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', magazines), 'D')) STORED,
  parodies TEXT NOT NULL,
  parodies_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', parodies), 'D')) STORED,
  tags TEXT NOT NULL,
  tags_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', tags), 'D')) STORED
);

CREATE INDEX title_tsv_archive_fts_idx ON archive_fts USING GIN(title_tsv);

CREATE INDEX artists_archive_fts_idx ON archive_fts USING GIST(artists GIST_TRGM_OPS);
CREATE INDEX artists_tsv_archive_fts_idx ON archive_fts USING GIN(artists_tsv);

CREATE INDEX circles_archive_fts_idx ON archive_fts USING GIST(circles GIST_TRGM_OPS);
CREATE INDEX circles_tsv_archive_fts_idx ON archive_fts USING GIN(circles_tsv);

CREATE INDEX magazines_archive_fts_idx ON archive_fts USING GIST(magazines GIST_TRGM_OPS);
CREATE INDEX magazines_tsv_archive_fts_idx ON archive_fts USING GIN(magazines_tsv);

CREATE INDEX parodies_archive_fts_idx ON archive_fts USING GIST(parodies GIST_TRGM_OPS);
CREATE INDEX parodies_tsv_archive_fts_idx ON archive_fts USING GIN(parodies_tsv);

CREATE INDEX tags_archive_fts_idx ON archive_fts USING GIST(tags GIST_TRGM_OPS);
CREATE INDEX tags_tsv_archive_fts_idx ON archive_fts USING GIN(tags_tsv);

CREATE OR REPLACE FUNCTION update_archive_fts()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO archive_fts (
    archive_id,
    title,
    artists,
    circles,
    magazines,
    parodies,
    tags
  )
  VALUES (
    NEW.id,
    (SELECT archives.title FROM archives WHERE id = NEW.id),
    (COALESCE((SELECT string_agg(artists.name, ' ') FROM artists INNER JOIN archive_artists r ON r.artist_id = artists.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(circles.name, ' ') FROM circles INNER JOIN archive_circles r ON r.circle_id = circles.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(magazines.name, ' ') FROM magazines INNER JOIN archive_magazines r ON r.magazine_id = magazines.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(parodies.name, ' ') FROM parodies INNER JOIN archive_parodies r ON r.parody_id = parodies.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.id), ''))
  )
  ON CONFLICT (archive_id) DO UPDATE SET
    title = EXCLUDED.title,
    artists = EXCLUDED.artists,
    magazines = EXCLUDED.magazines,
    circles = EXCLUDED.circles,
    parodies = EXCLUDED.parodies,
    tags = EXCLUDED.tags;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_archive_fts_rela()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO archive_fts (
    archive_id,
    title,
    artists,
    circles,
    magazines,
    parodies,
    tags
  )
  VALUES (
    NEW.archive_id,
    (SELECT archives.title FROM archives WHERE id = NEW.archive_id),
    (COALESCE((SELECT string_agg(artists.name, ' ') FROM artists INNER JOIN archive_artists r ON r.artist_id = artists.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(circles.name, ' ') FROM circles INNER JOIN archive_circles r ON r.circle_id = circles.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(magazines.name, ' ') FROM magazines INNER JOIN archive_magazines r ON r.magazine_id = magazines.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(parodies.name, ' ') FROM parodies INNER JOIN archive_parodies r ON r.parody_id = parodies.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.archive_id), ''))
  )
  ON CONFLICT (archive_id) DO UPDATE SET
    title = EXCLUDED.title,
    artists = EXCLUDED.artists,
    magazines = EXCLUDED.magazines,
    circles = EXCLUDED.circles,
    parodies = EXCLUDED.parodies,
    tags = EXCLUDED.tags;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_archive_fts_on_archives
AFTER INSERT OR UPDATE ON archives
FOR EACH ROW
EXECUTE FUNCTION update_archive_fts();

CREATE TRIGGER trigger_update_archive_fts_on_archive_artists
AFTER INSERT OR UPDATE ON archive_artists
FOR EACH ROW
EXECUTE FUNCTION update_archive_fts_rela();

CREATE TRIGGER trigger_update_archive_fts_on_archive_tags
AFTER INSERT OR UPDATE ON archive_tags
FOR EACH ROW
EXECUTE FUNCTION update_archive_fts_rela();

CREATE TRIGGER trigger_update_archive_fts_on_archive_circles
AFTER INSERT OR UPDATE ON archive_circles
FOR EACH ROW
EXECUTE FUNCTION update_archive_fts_rela();

CREATE TRIGGER trigger_update_archive_fts_on_archive_magazines
AFTER INSERT OR UPDATE ON archive_magazines
FOR EACH ROW
EXECUTE FUNCTION update_archive_fts_rela();

CREATE TRIGGER trigger_update_archive_fts_on_archive_parodies
AFTER INSERT OR UPDATE ON archive_parodies
FOR EACH ROW
EXECUTE FUNCTION update_archive_fts_rela();