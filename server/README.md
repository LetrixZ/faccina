# Faccina • Server

## Configuration

Server configuration should be located alongside the binary. Use `CONFIG_FILE` enviornment variable to set a location.

```toml
[database]
host = "127.0.0.1"
port = 5432
name = "faccina"
user = "faccina"
password = "faccina"

[server]
host = "0.0.0.0"
port = 3000

[directories]
data = "./data"
content = "./content"
log = "./logs"

[thumbnails]
quality = 50
cover_quality = 50
speed = 4
cover_speed = 4
format = "webp"
width = 320
cover_width = 540

[metadata]
parse_filename_title = true
```

### Config explanation

#### Database

- `host`: Hostname
- `port`: Port
- `name`: Database name
- `user`: Database username
- `password`: Database password

#### Server

- `host`: Hostname to bind
- `port`: Server port

#### Directories

- `data`: Location to save thumbnails and symbolic links to the content. Default `./data`
- `content`: Default location to check for archive zip files. Default `./content`
- `logs`: Location to store server logs. Default `./logs`

#### Thumbnails

- `quality`: Image encoder quality for the thumbnails. From 1-100 (worst-best). Default `50`. Only for `avif`, `webp` and `jpeg`.
- `cover_quality`: Image encoder quality for the covers. From 1-100 (worst-best). Uses `quality` as default. Only for `avif`, `webp` and `jpeg`.
- `speed`: Speed of the AVIF thumbnail encoder. From 1-10 (slowest-fastest). Default `4`. Only for `avif`.
- `cover_speed`: Speed of the AVIF cover encoder. From 1-10 (slowest-fastest). Default `4`. Only for `avif`.
- `format`: Image encoder to use. Can be `avif`, `webp` (default), `jpeg` and `png`.
- `width`: Width of the generated thumbnail.
- `cover_width`: Width of the generated gallery cover. Uses `width` as default.

#### Metadata

- `parse_filename_title`: Indicates if it should try to get a title from the filename. Applies to **HenTag**, **Eze**, **GalleryDL** and **Koromo** parsers.

## Usage

### Indexing

Run `./server index` to index the archives located at the configured content path.

Pass one or multiple paths to the command to navigate those.

- `-r`, `--recursive`: Indicate that it should navigate the path recursevly.
- `--reindex`: Reindex archives. Useful for metadata changes and when moving files.
- `--dimensions`: Calculate image dimensions when indexing.
- `--thumbnails`: Generate thumbnails when indexing.
- `--from-path <PATH>`: Start from this path. Useful to resume from errors.

### Thumbnail generation

Run `./server generate-thumbnails` to generate the thumbnails for existing archives.

Thumbnails will be saved in the `./data/thumbs/:id/` directory following the format `{page}.t.avif` for thumbnails and `{page}.c.avif` for gallery covers.

- `--id <ID_RANGE>`: Indicate one or multiple archive IDs to generate thumbnails for.
- `--regenerate`: Regenerate existing thumbnails.
- `-q`, `--quality`: Image encoder quality for the thumbnails. From 1-100 (worst-best). Default `50`. Only for `avif`, `webp` and `jpeg`.
- `--cover-quality` Image encoder quality for the covers. From 1-100 (worst-best). Uses `quality` as default. Only for `avif`, `webp` and `jpeg`.
- `-s`, `--speed`: Speed of the AVIF thumbnail encoder. From 1-10 (slowest-fastest). Default `4`. Only for `avif`.
- `--cover-speed`: Speed of the AVIF cover encoder. From 1-10 (slowest-fastest). Default `4`. Only for `avif`.
- `-w`, `--width`: Width of the generated thumbnail.
- `--cover--width`: Width of the generated gallery cover. Uses `width` as default.
- `--format`: Image encoder to use. Can be `avif`, `webp` (default), `jpeg` and `png`.

### Calculate image dimensions

Run `./server calculate-dimensions`.

Calculates dimensions of the image. They're needed to avoid layout shifts when loading images.

- `--id <ID_RANGE>`: Indicate one or multiple archive IDs to calculate image dimensions for.

### Scrape metadata

Run `./server scrape <SITE>`.

Scrape metadata from the specified site for archives that don't have metadata already.
Currently only **HenTag** (`hentag`) is available.

It will replace any data already present in the archive. Only sources are merged.

- `--id <ID_RANGE>`: Indicate one or multiple archive IDs to scrape metadata for.
- `--sleep <MS>`: Indicate how much milliseconds to wait between archives to avoid rate limits. Default is 1000.

### Publish and Unpublish archives

Run `./server publish <ID>` or `./server unpublish <ID>`.
`<ID>` can be a range. Example: `1-10,14,230-400`

This will change the visiblity of the given archives.

### Start server

Run the `./server` binary to run the server.

You can specify the level of logs using the `LOG_LEVEL` environment variable. `info` log level by default.

## Building

#### Requierments

- Rust: https://rustup.rs/

Run `cargo build --release`, while located in the `server` directory, to generate a release binary. It will be generated in `taget/release/server`.

Release mode will significantly speed up thumbnail generation.
