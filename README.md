# Faccina

Archive reader

## Planned features

- Add downloads support:
  - [WebTorrents](https://webtorrent.io/) downloads.
  - Server-side resampled downloads.
  - Client-side resampled downloads.
- Trending page.
- Message of the day.
- Public API for 3rd-party apps.
- Admin dashboard to manage the galleries.
- Listing pages for artists, circles, magazines, parodies and tags.
- User account support.
  - User categories.
- Gallery upload support.
- Reader improvments:
  - Add different touch layouts.
  - Auto scroll.
- HenTag scraper.
- Gallery collections.

## Screenshots

![Library](/assets/library.webp?raw=true "Library page")
![Gallery](/assets/gallery.webp?raw=true "Gallery page")
![Reader](/assets/reader.webp?raw=true "Reader page")

## Usage with Docker Compose

Use `docker-compose.example.yaml` as a base.

- The `content` directory is where the archives are located.
- The `data` directory is where thumbnails and symbolic links to the content are saved.
- `PUBLIC_CDN_URL` is the public URL of the server where images are loaded from.
