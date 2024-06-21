CREATE TABLE torrents
(
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX torrent_name_idx ON torrents (name);

CREATE TABLE archive_torrents
(
  archive_id BIGINT REFERENCES archives(id) ON DELETE CASCADE,
  torrent_id BIGINT REFERENCES torrents(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  size BIGINT NOT NULL,
  PRIMARY KEY(archive_id, torrent_id)
);