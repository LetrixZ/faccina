# Faccina

## Running

To run the server you need to have [Bun](https://bun.sh/) installed.

- Clone the project and enter the directory.
- Install the dependencies by running `bun install`.
- Check the [configuration](#configuration).
- Run `bun run build` to build the website.

You can then start the server with `bun start` or you can use `bun cluster` to start multiple servers as a [cluster](https://bun.sh/guides/http/cluster).

## Docker Compose

Make sure to read the [configuration setup](#configuration) first.

- Copy `docker-compose.example.yaml` to `docker-compose.yaml` and adjust the port and mount points to your setup.
- Run `docker compose up` to build and start the server.

Use `docker compose exec app bun cli` to interact with the CLI.

## Configuration

The configuration will be read from `./config.toml`.

### Site

```toml
[site]
site_name = 'Faccina'
url = 'https://example.com'
enable_users = true
admin_users = ['superuser']
default_sort = 'released_at'
default_order = 'desc'
guest_downloads = true
search_placeholder = ''
store_og_images = true
secure_session_cookie = true
client_side_downloads = true
```

- `site_name`: Specifies the title showed in pages and emails.
- `url`: Public URL of the site.
- `enable_users`: Used to enable/disable user features such as user registration, login and favorites. Use the `uli` command to login as admin.
- `enable_collections`: Enable user collections.
- `enable_analytics`: Enable site analytics.
- `admin_users`: List of usernames that will be given admin privileges. If you use the `uli` command to login as an admin user and this user does not exists, a new one will be created.
- `default_sort`: Default sorting when nothing was specified by the user.
- `default_order`: Default ordering when nothing was specified by the user.
- `guest_downloads`: Show download button for guests users.
- `search_placeholder`: Placeholder text for the search bar.
- `store_og_images`: Save generated OpenGraph meta images on disk.
- `secure_session_cookie`: Indicate if the session cookie should be secure or not.
- `client_side_downloads`: Indicate if it gallery downloads should happen on the client or not. Client-side downloads work by downloading the image in the user's browser and packaging the ZIP locally.

#### Gallery listing

```toml
page_limits = [24]
default_page_limit = 24
```

- `page_limits`: Array of numbers containing the options for the "Per page" filter in gallery listings.
- `default_page_limit`: The default option in the "Per page" filter. If this is not specified, the first page limit will be used.

##### Tag weight mapping

You can create a tag weight map to assign weights to `namespace:tag` combinations. These are used for gallery listings. Useful to showcase important tags before opening a gallery.

```toml
[[site.gallery_listing.tag_weight]]
name = ['illustration', 'cg-set', 'cg set']
weight = 20
ignore_case = true

[[site.gallery_listing.tag_weight]]
name = 'color'
weight = 15
ignore_case = true
```

By default, all tags have 0 weight, so these tags will be displayed first in listings.

##### Tag exclude

You can exclude tags from displaying in the gallery card on listings.

```toml
[[site.gallery_listing.tag_exclude]]
name = ['original', 'original work']
ignore_case = true
```

This will exclude `original` and `original work` tags in all namespaces from displaying in the gallery card.

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

#### Tag mapping

You can create a tag map to assign a `namespace:tag` combination to another `new_namespace:new_tag` combo.

```toml
[[metadata.tag_mapping]]
match = 'original'
match_namespace = 'parody'
name = 'original work'
ignore_case = true
```

For this example, any archive containing the `parody:original` tag will be mapped to `parody:original work`

The `match_namespace` key is an optional used to only restrict tags on the `parody` namespace. With this example, `tag:original` will not get mapped.

To indicate if casing should be ignored for the match specify the `ignore_case` key: `ignore_case = true`. Using the example config, `parody:Original` will be mapped to `parody:original work`.

You can also choose to which namespace map the tag by specifing the `namespace` key.

```toml
[[metadata.tag_mapping]]
match = ['fate grand order', 'Fate/Grand Order']
namespace = 'parody'
```

This will make the tag `tag:fate grand order` and `tag:Fate/Grand Order` to `parody:fate grand order` and `parody:Fate/Grand Order` respectively.

#### Source mapping

Similar to tag mapping, you can map source names so they can be asigned to URLs when no name is given by the archive metadata.

```toml
[[metadata.source_mapping]]
match = 'pixiv'
name = 'Pixiv'
ignore_case = true
```

For this example, if the archive metadata only provides a URL like this: `https://www.pixiv.net/en/artworks/12345678/` then the name `Pixiv` will be added to it. By default, if no source name was providad by the archive metadata and mappins, then it will default to the hostname in the URL given that the URL is valid, if not, the source will not be added during indexing.

If the given source already has a name paired to it, the name will be replace if a match is found.

### Image

Default configuration

```toml
[image]
cover_preset = 'cover'
thumbnail_preset = 'cover'
aspect_ratio_similar = true
remove_on_update = true

[image.preset.cover]
format = 'webp'
width = 540

[image.preset.thumbnail]
format = 'webp'
width = 360
```

- `cover_preset`: Indicates which preset to use for covers.
- `thumbnail_preset`: Indicates which preset to use for thumbnails.
- `aspect_ratio_similar`: If enabled, images that are similar to 45:64 (0.703125) aspect ratio will be adapted to it. This will trigger if the aspect ratio is between 0.65 and 0.75. Example, 2:3 (0.66) aspect ratio will be transformed to 45:64.
- `remove_on_update`: If enabled during indexing, any image change will remove the resampled image. Useful when changing filename:page number pairs.

#### Encoding options

Below are the default encoding options for every supported format that can be overriden.

```toml
# WEBP default configuration
quality = 80          # 1-100
lossless = false
speed = 4            # 0-6

# JPEG default configuration
quality = 75        # 1-100

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

Use the `--ids <IDs...>` option to indicate which archives it should generate images for.

`-f` or `--force` can be used to re-generate images.

### Scrape

You can scrape sites for metadata. Use `bun cli metadata:scrape <site>`. Currently, only `hentag` is supported.

Use the `--ids <IDs...>` option to indicate which archives it should scrape metadata for.

With `--sleep <time>` you can indicate (in milliseconds) how much time to wait between site requests. By default it's 5 seconds.

You can also use `-y` or `--no-interact` to skip any prompts. If there are multiple results from the scraper, the best one will be chosen by comparing its titles. If not specified, you will be prompted to select from a list.

### User login

You can generate a one-time login link for any user using the `uli <username>` command.

### Recovery

Send an access recovery email to a user with the `recovery <username>` command. If you only want to get the code without sending an email, use the `-c` or `--code` option.

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
