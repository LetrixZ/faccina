# Faccina

## Running

To run the server you need to have [Bun](https://bun.sh/) installed.

- Clone the project and enter the directory.
- Install the dependencies by running `bun install`.
- Check the [configuration](#configuration).
- Run `bun run build` to build the website.

You can then start the server with `bun start` or you can use `bun cluster` to start multiple servers as a [cluster](https://bun.sh/guides/http/cluster).

## CLI

To operate with the site you need to use the CLI. You can run `bun cli --help` to see the available commands and a quick summary.

### Index

To index archives located in the content directory, run `bun cli index`.

You can pass the `-f` or `--force` option to update indexed archives. Use this if you want to update the metadata or contents of your archives.

Use the `--reindex` option to only update alredy indexed archives and skip new ones.

To only index certain paths, you can use `-p  <paths...>` or `--paths <paths...>` and indicate a space separated list of paths to index. This is useful if you want to index something that isn't in the content directory or to update a specific archive.

If you want to resume indexing, you can use the `--from-path <path>` option to indicate which path (in the content directory) should start indexing from.

**Note**: some paths are incompatible with NPM scripts so if you use `--from-path <path>`, `-p  <paths...>` or `--paths <paths...>` and any of these fails, try running the CLI directly with `bun ./cli/index.ts`.

### Prune

Run the `prune` command to delete archives that don't exist anymore in the file system.

### Generate Images

You can generate all covers and page thumbnails using the `generate-images` command. Useful if you don't want or can't generate the images on-demand.

The image generation separates archive images in batches to process them more efficiently. By default, the amount of images per batch is 4 times the core count of your computer. You can indicate a fixed image size by using `--batch-size <size>`.

Use the `--ids <IDs...>` option to indicate which archives it should generate images for.

`-f` or `--force` can be used to re-generate images.

### User login

You can generate a one-time login link for any user using the `uli <username>` command.

### Recovery

Send an access recovery email to a user with the `recovery <username>` command. If you only want to get the code without sending an email, use the `-c` or `--code` option.

## Configuration

The configuration will be read from `./config.toml` by default. Use the environment variable `CONFIG_PATH` to specify another location.\
It will be parsed using Zod schemas.

### Site

```toml
[site]
site_name = 'Faccina'
url = 'https://example.com'
enable_users = true
admin_users = ['superuser']
default_sort = 'released_at'
default_order = 'desc'
```

- `site_name`: Specifies the title showed in pages and emails.
- `url`: Public URL of the site.
- `enable_users`: Used to enable/disable user features such as user registration, login and favorites. Use the `uli` command to login as admin.
- `admin_users`: List of usernames that will be given admin privileges. If you use the `uli` command to login as an admin user and this user does not exists, a new one will be created.
- `default_sort`: Default sorting when nothing was specified by the user.
- `default_order`: Default ordering when nothing was specified by the user.

### Directories

```toml
[directories]
content = '/path/to/archives'
images = '/path/to/images'
```

- `content`: Where CBZ archives are located. Use a read-only mount for safety.
- `images`: Where generated images will be located.

### Database

The server supports both PostgreSQL and SQLite.\
SQLite is blazingly fast but can cause problems when multiple writers are needed.\
This might present problems when users are involved in the equation. Registration, login and favorites all need to write to the database. Add to that indexing and image dimension calculation.

#### SQLite example

```toml
[database]
vendor = 'sqlite'
path = '/path/to/db.sqlite3'
apply_optimizations = true # default
```

`apply_optimizations` will run these queries when initializing a SQLite connection:

```sql
PRAGMA journal_mode = wal;
PRAGMA synchronous = normal;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = true;
```

#### PostgreSQL example

```toml
[database]
vendor = 'postgresql'
user = db_admin
database = faccina
password = supersecurepassword
host = 127.0.0.1
port = 5432
```

### Metadata

Metadata parsing options.

```toml
[metadata]
parse_filename_as_title = true # default
```

- `parse_filename_as_title`: If the available metadata didn't offer a title, indicate if it should try to get a title from the filename or use the filename as the gallery title.\
  Example: "[Artist] My Gallery Title" will become "My Gallery Title".

### Image

The server encodes images using the [image-encoder](https://github.com/LetrixZ/image-encoder) Rust package.

**It only has binaries available for GNU/Linux x86 and ARM64, macOS x86 and ARM64 and Windows x86.**

If you want to run the server in any other platform, please open a GitHub issue indicating which platform you're on.

#### Encoding options

Below are the default encoding options for every supported format that can be overriden.

```toml
# WEBP default configuration
quality = 80          # 1-100
lossless = false
speed = 4            # 0-6

# JPEG default configuration
quality = 75        # 1-100

# PNG doesn't have configuration

# JXL default configuration
quality = 1     # 0.0-15.0
lossless = false
speed = 7       # 1-10

# AVIF default configuration
quality = 80     # 1-100
speed = 4       # 1-10
```

You can use these as a reference to override encoding options in a specific preset or globally for all presets.

#### Image encoding presets

A image encdoing preset can be made to be used for encoding covers, thumbnails or resampled images.

Example:

```toml
[image.preset.jxl480]
format = 'jxl'      # webp, jpeg, png, jxl, avif
width = 480
quality = 70
speed = 8
```

To use this preset for covers:

```toml
[image]
cover_preset = 'jxl480'
```

On a cover request, the server will look for a file named `images/{hash}/jxl480/{page_number}.jxl`. If it doesn't exists, it will be added to a queue to be generated.

Use `thumbnail_preset` for page thumbnails.

If no presets for cover nor thumbnails are specified, the configuration will default to:

```toml
[image]
cover_preset = 'cover'
thumbnail_preset = 'cover'

[image.preset.cover]
format = 'webp'
width = 540

[image.preset.thumbnail]
format = 'webp'
width = 360
```

### Mail

The server can send emails for account access recovery. If no options are specified, account access recovery will be disabled.

```toml
[mailer]
host = "smtp.example.com"
port = 465
secure = true
user = "smtp_username"
pass = "smtp_password"
from = "admin@example.com"
```

## Migrate from v1

### Images migration

You can migrate the old resampled images to the new folder structure.

Use the `migrate:images` command.\
You need to specify the v1 data directory, the format that will be migrated to the default preset and a connection string for the v1 database.

**The image migration must be done before the database migration**

### Database migration

**Backup your database before continuing**

#### PostgreSQL -> SQLite

You can migrate the archives from the v1 database to a new SQLite database.

Use the `migrate:db` command.\
You need to specify a connection string for the v1 database. Example: `postgres://user:password@hostname:port/database`.

If you had duplicated paths in the previous database, only the latest non-deleted one will be kept. A list of lost archives will be saved to `./lost_{{timestamp}}.json`.

Once migrated, make a forced index to finish the process: `bun ./cli index --force`.

#### PostgreSQL -> PostgreSQL

To migrate from a v1 PostgreSQL to a v2 PostgreSQL, you only need to make a forced index.\
The same database can be used.
