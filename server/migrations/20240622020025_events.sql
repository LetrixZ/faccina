CREATE TABLE events
(
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  slug VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE archive_events
(
  archive_id BIGINT REFERENCES archives(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  PRIMARY KEY(archive_id, event_id)
);

CREATE INDEX archive_events_archive_id_idx ON archive_events (archive_id);
CREATE INDEX archive_events_event_id_idx ON archive_events (event_id);

ALTER TABLE archive_fts ADD events TEXT NULL;
UPDATE archive_fts SET events = '';
ALTER TABLE archive_fts ALTER COLUMN events SET NOT NULL;
ALTER TABLE archive_fts ADD events_tsv TSVECTOR GENERATED ALWAYS AS (SETWEIGHT(TO_TSVECTOR('english', events), 'D')) STORED;

CREATE INDEX events_archive_fts_idx ON archive_fts USING GIST(events GIST_TRGM_OPS);
CREATE INDEX events_tsv_archive_fts_idx ON archive_fts USING GIN(events_tsv);

CREATE OR REPLACE FUNCTION update_archive_fts()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO archive_fts (
    archive_id,
    title,
    artists,
    circles,
    magazines,
    events,
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
    (COALESCE((SELECT string_agg(events.name, ' ') FROM events INNER JOIN archive_events r ON r.event_id = events.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(publishers.name, ' ') FROM publishers INNER JOIN archive_publishers r ON r.publisher_id = publishers.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(parodies.name, ' ') FROM parodies INNER JOIN archive_parodies r ON r.parody_id = parodies.id  WHERE r.archive_id = NEW.id), '')),
    (COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.id), ''))
  )
  ON CONFLICT (archive_id) DO UPDATE SET
    title = EXCLUDED.title,
    artists = EXCLUDED.artists,
    magazines = EXCLUDED.magazines,
    events = EXCLUDED.events,
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
    events,
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
    (COALESCE((SELECT string_agg(events.name, ' ') FROM events INNER JOIN archive_events r ON r.event_id = events.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(publishers.name, ' ') FROM publishers INNER JOIN archive_publishers r ON r.publisher_id = publishers.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(parodies.name, ' ') FROM parodies INNER JOIN archive_parodies r ON r.parody_id = parodies.id  WHERE r.archive_id = NEW.archive_id), '')),
    (COALESCE((SELECT string_agg(tags.name, ' ') FROM tags INNER JOIN archive_tags r ON r.tag_id = tags.id  WHERE r.archive_id = NEW.archive_id), ''))
  )
  ON CONFLICT (archive_id) DO UPDATE SET
    title = EXCLUDED.title,
    artists = EXCLUDED.artists,
    magazines = EXCLUDED.magazines,
    events = EXCLUDED.events,
    circles = EXCLUDED.circles,
    publishers = EXCLUDED.publishers,
    parodies = EXCLUDED.parodies,
    tags = EXCLUDED.tags;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_archive_fts_on_archive_events
AFTER INSERT OR UPDATE ON archive_events
FOR EACH ROW
EXECUTE FUNCTION update_archive_fts_rela();