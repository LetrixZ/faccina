CREATE TABLE publishers
(
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  slug VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE archive_publishers
(
  archive_id BIGINT REFERENCES archives(id) ON DELETE CASCADE,
  publisher_id BIGINT REFERENCES publishers(id) ON DELETE CASCADE,
  PRIMARY KEY(archive_id, publisher_id)
);

CREATE INDEX archive_publishers_archive_id_idx ON archive_publishers (archive_id);
CREATE INDEX archive_publishers_publisher_id_idx ON archive_publishers (publisher_id);

ALTER TABLE archive_fts ADD publishers TEXT NULL;
UPDATE archive_fts SET publishers = '';
ALTER TABLE archive_fts ALTER COLUMN publishers SET NOT NULL;
ALTER TABLE archive_fts ADD publishers_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', publishers), 'D')) STORED;

CREATE INDEX publishers_archive_fts_idx ON archive_fts USING GIST(publishers GIST_TRGM_OPS);
CREATE INDEX publishers_tsv_archive_fts_idx ON archive_fts USING GIN(publishers_tsv);

CREATE OR REPLACE FUNCTION update_archive_fts()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO archive_fts (
    archive_id,
    title,
    artists,
    circles,
    magazines,
    publishers,
    parodies,
    tags
  )
  VALUES (
    NEW.id,
    (SELECT archives.title FROM archives WHERE id = NEW.id),
    (COALESCE((SELECT string_agg(artists.name, ' ') FROM artists INNER JOIN archive_artists r ON r.artist_id = artists.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(circles.name, ' ') FROM circles INNER JOIN archive_circles r ON r.circle_id = circles.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(magazines.name, ' ') FROM magazines INNER JOIN archive_magazines r ON r.magazine_id = magazines.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(publishers.name, ' ') FROM publishers INNER JOIN archive_publishers r ON r.publisher_id = publishers.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(parodies.name, ' ') FROM parodies INNER JOIN archive_parodies r ON r.parody_id = parodies.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.id), ''))
  )
  ON CONFLICT (archive_id) DO UPDATE SET
    title = EXCLUDED.title,
    artists = EXCLUDED.artists,
    magazines = EXCLUDED.magazines,
    circles = EXCLUDED.circles,
    publishers = EXCLUDED.publishers,
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
    publishers,
    parodies,
    tags
  )
  VALUES (
    NEW.archive_id,
    (SELECT archives.title FROM archives WHERE id = NEW.archive_id),
    (COALESCE((SELECT string_agg(artists.name, ' ') FROM artists INNER JOIN archive_artists r ON r.artist_id = artists.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(circles.name, ' ') FROM circles INNER JOIN archive_circles r ON r.circle_id = circles.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(magazines.name, ' ') FROM magazines INNER JOIN archive_magazines r ON r.magazine_id = magazines.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(publishers.name, ' ') FROM publishers INNER JOIN archive_publishers r ON r.publisher_id = publishers.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(parodies.name, ' ') FROM parodies INNER JOIN archive_parodies r ON r.parody_id = parodies.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.archive_id), ''))
  )
  ON CONFLICT (archive_id) DO UPDATE SET
    title = EXCLUDED.title,
    artists = EXCLUDED.artists,
    magazines = EXCLUDED.magazines,
    circles = EXCLUDED.circles,
    publishers = EXCLUDED.publishers,
    parodies = EXCLUDED.parodies,
    tags = EXCLUDED.tags;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_archive_fts_on_archive_publishers
AFTER INSERT OR UPDATE ON archive_publishers
FOR EACH ROW
EXECUTE FUNCTION update_archive_fts_rela();