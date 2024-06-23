# Faccina

Archive reader

## Planned features

- [Public API for 3rd-party apps](https://github.com/LetrixZ/faccina/issues/13)
- [Reader improvments](https://github.com/LetrixZ/faccina/issues/8)
- [Resampled images](https://github.com/LetrixZ/faccina/issues/1)
- [Trending page](https://github.com/LetrixZ/faccina/issues/3)
- [WebTorrent integration](https://github.com/LetrixZ/faccina/issues/2)
- [Admin dashboard to manage the galleries](https://github.com/LetrixZ/faccina/issues/5)
- [Message of the day](https://github.com/LetrixZ/faccina/issues/6)
- [Listing pages for artists, circles, magazines, parodies and tags](https://github.com/LetrixZ/faccina/issues/7)
- [User account support](https://github.com/LetrixZ/faccina/issues/11)
- [User categories](https://github.com/LetrixZ/faccina/issues/9)
- [Gallery collections](https://github.com/LetrixZ/faccina/issues/10)
- [Gallery upload support](https://github.com/LetrixZ/faccina/issues/12)

## Screenshots

![Library](/assets/library.webp?raw=true "Library page")
![Gallery](/assets/gallery.webp?raw=true "Gallery page")
![Reader](/assets/reader.webp?raw=true "Reader page")

## Usage with Docker Compose

Use `docker-compose.example.yaml` as a base.

- The `content` directory is where the archives are located.
- The `data` directory is where thumbnails and symbolic links to the content are saved.
- `PUBLIC_CDN_URL` is the public URL of the server where images are loaded from.
