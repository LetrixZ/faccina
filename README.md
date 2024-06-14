# Faccina

Archive reader

## Planned features

- Add downloads support:
  - Client-side downloads.
  - [WebTorrents](https://webtorrent.io/) downloads.
  - Server-side resampled downloads.
  - Client-side resampled downloads.
- Admin dashboard to manage the galleries.
- Public API for 3rd-party apps.
- Listing pages for artists, circles, magazines, parodies and tags.
- User account support.
- Gallery upload support.
- Reader improvments:
  - Add different touch layouts.

## Screenshots

![Library](/assets/library.webp?raw=true "Library page")
![Gallery](/assets/gallery.webp?raw=true "Gallery page")
![Reader](/assets/reader.webp?raw=true "Reader page")

## Usage with Docker Compose

Use `docker-compose.example.yaml` as a base.

- The `content` directory is where the archives are located.
- The `data` directory is where thumbnails and symbolic links to the content are saved.
- `CDN_URL` is the public URL of the server where images are loaded from.
