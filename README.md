# Faccina

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
```

- `site_name`: Specifies the title showed in pages and emails.
- `url`: Public URL of the site.
- `enable_users`: Used to enable/disable user features such as user registration, login and favorites. Use the `uli` command to login as admin.
- `admin_users`: List of usernames that will be given admin privileges. If you use the `uli` command to login as an admin user and this user does not exists, you will be prompted to create one.

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

#### Encoding options

The server uses [Sharp](https://sharp.pixelplumbing.com) for encoding the images.\
Below are the default encoding options for every supported format that can be overriden.

```toml
# WEBP default configuration
quality = 80          # 1-100
lossless = false
near_lossless = false
effort = 4            # 0-6

# JPEG default configuration
quality = 80        # 1-100
progressive = false

# PNG default configuration
progressive = false
effort = 7          # 1-10
compression = 6     # 0-9

# JXL default configuration
quality = 80     # 1-100
distance = 1.0   # 1-15
lossless = false
effort = 7       # 3-9

# AVIF default configuration
quality = 50     # 1-100
lossless = false
effort = 4       # 0-9
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
effort = 8
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
username = "smtp_username"
password = "smtp_password"
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
You need to specify a connection string for the v1 database. Example: `postgres://user:password@hostname:port/database`

Once migrated, make a forced index to finish the process: `bun ./cli index --force`.

#### PostgreSQL -> PostgreSQL

To migrate from a v1 PostgreSQL to a v2 PostgreSQL, you only need to make a forced index.\
The same database can be used.
