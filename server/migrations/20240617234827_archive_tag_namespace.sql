ALTER TABLE tags DROP COLUMN namespace;
ALTER TABLE archive_tags ADD namespace VARCHAR NOT NULL DEFAULT '';
ALTER TABLE archive_tags DROP CONSTRAINT archive_tags_pkey;
ALTER TABLE archive_tags ADD PRIMARY KEY(archive_id, tag_id, namespace);