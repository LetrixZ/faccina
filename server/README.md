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
width = 320
cover_width = 540
```

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

- `quality`: Quality of the AVIF thumbnail. From 1-100 (worst-best). Default `50`.
- `cover_quality`: Quality of the AVIF gallery cover. From 1-100 (worst-best). Uses `quality` as default.
- `speed`: Speed of the AVIF thumbnail encoder. From 1-10 (slowest-fastest). Default `4`.
- `cover_speed`: Speed of the AVIF gallery cover encoder. From 1-10 (slowest-fastest). Uses `speed` as default.
- `width`: Width of the generated thumbnail.
- `cover_width`: Width of the generated gallery cover. Uses `width` as default.

## Usage

### Indexing

Run `./server index` to index the archives located at the configured content path.

Pass one or multiple paths to the command to navigate those.

- `-r`, `--recursive`: Indicate that it should navigate the path recursevly.
- `--reindex`: By default, the program will check if a path exists in the database to know if it should skip that archive. Using this option will skip that check. Archives will be matched by their hash and updated accordingly if a match is found. **Use this to re-create symbolic links when necessary**.
- `--skip-thumbnails`: Skip thumbnail generation

### Thumbnail generation

_Generated automatically with indexing (unless `--skip-thumbnails` was specified)_

Run `./server generate-thumbnails` to generate the thumbnails for existing archives.

Thumbnails will be saved in the `./data/thumbs/:id/` directory following the format `{page}.t.avif` for thumbnails and `{page}.c.avif` for gallery covers.

- `--ids <IDS>`: Indicate one or multiple archive IDs to generate thumbnails for.
- `--regenerate`: Regenerate existing thumbnails.
- `-q`, `--quality`: Quality of the AVIF thumbnail. From 1-100 (worst-best). Default `50`.
- `--cover-quality`: Quality of the AVIF gallery cover. From 1-100 (worst-best). Uses `quality` as default.
- `-s`, `--speed`: Speed of the AVIF thumbnail encoder. From 1-10 (slowest-fastest). Default `4`.
- `--cover-speed`: Speed of the AVIF gallery cover encoder. From 1-10 (slowest-fastest). Uses `speed` as default.
- `-w`, `--width`: Width of the generated thumbnail.
- `--cover--width`: Width of the generated gallery cover. Uses `width` as default.

### Start server

Run the `./server` binary to run the server.

You can specify the level of logs using the `LOG_LEVEL` environment variable. `info` log level by default.

## Building

#### Requierments

- Rust: https://rustup.rs/

Run `cargo build --release`, while located in the `server` directory, to generate a release binary. It will be generated in `taget/release/server`.

Release mode will significantly speed up thumbnail generation.
