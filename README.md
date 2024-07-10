# Faccina

Archive reader

## Screenshots

![Library](/assets/library.webp?raw=true "Library page")
![Gallery](/assets/gallery.webp?raw=true "Gallery page")
![Reader](/assets/reader.webp?raw=true "Reader page")

## Usage with Docker Compose

Use `docker-compose.example.yaml` as a base.

- The `content` directory is where the archives are located.
- The `data` directory is where thumbnails and symbolic links to the content are saved.
- `PUBLIC_CDN_URL` is the public URL of the server where images are loaded from.
