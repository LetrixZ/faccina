ALTER TABLE archives DROP CONSTRAINT archives_slug_key;

ALTER TABLE archives ADD COLUMN has_metadata BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE archives SET has_metadata = TRUE WHERE EXISTS (SELECT 1 FROM archive_tags LEFT JOIN tags ON tags.id = archive_tags.tag_id WHERE archive_tags.archive_id = archives.id);

ALTER TABLE archive_images ALTER COLUMN width DROP NOT NULL;
ALTER TABLE archive_images ALTER COLUMN height DROP NOT NULL;

ALTER TABLE archives ALTER COLUMN pages DROP NOT NULL;
ALTER TABLE archives DROP COLUMN translated;
ALTER TABLE archives ALTER COLUMN thumbnail SET DEFAULT 1;
ALTER TABLE archives DROP CONSTRAINT archives_path_key;