# Faccina

## Installation

### Binaries

You can get Faccina through the releases on [GitHub](https://github.com/LetrixZ/faccina/releases). Binaries are still experimental and it's recommended to run Faccina with the source code directly.

You can also compile Faccina to a binary yourself. Just run `build.sh` (macOS/Linux) or `build.ps1` (Windows) after installing the dependencies with `bun install`.

### From Source (recommended)

First you will need to clone the repository or get an [archive](https://github.com/LetrixZ/faccina/archive/refs/heads/main.zip).

Run this command to clone the repository with `git`:

```bash
git clone https://github.com/LetrixZ/faccina
```

Now you will need to install Bun if you don't have it already. You can get it from here: <https://bun.sh>

Once installed, go to the folder where the source code is and install the dependencies using Bun:

```bash
bun install --frozen-lockfile
```

Before you can build the web app, you will need to create a configuration file named `config.toml`. You can use the example one for now:

```bash
cp config.example.toml config.toml
```

Now you can build the web app by running:

```bash
bun run build
```

Once finished, you can start the web app by running:

```bash
bun start
```

You can also start it in cluster mode so it runs many instances according to the numbers of threads you have:

```bash
bun cluster
```

The web app will be available at port 3000.

You can already use Faccina like this, although it's recommended that you read the rest of the documentation to know how to configure it so you can point it to where you have your content, where to store thumbnails and more.

## Configuration

Faccina uses a TOML-structured file for its configuration. By default, it will read the `config.toml` file that's in the root directory. You can change this by passing the environment variable `CONFIG_FILE`.

The configuration is very extensive. I will be explaining every section while including the default values for every property.

I will start with the basics.

### Directories

You can use this setting to indicate where Faccina will look for content to index and where it should store the generated thumbnails and other resampled images.

This setting doesn't have a default but it's included in the example configuration.

```toml
[directories]
content = './content'
images = './images'
```

#### Content directory

The content property indicates where it should look for the comic archives, CBZ and ZIP files.

The content can also be structured in folders with it's pages inside.

Here's an example of a valid structure that the content directory can have:

```text
─ content
  ├── Assisted Love Series
  │   ├── Assisted Love 3.cbz
  │   ├── Assisted Love 4.zip
  │   └── Assisted Love 5
  │       ├── 01.png
  │       ├── 02.png
  │       ├── 03.png
  │       └── info.json
  ├── Assisted Love 2
  │   ├── 01.png
  │   ├── 02.png
  │   ├── 03.png
  │   └── info.json
  ├── Assisted Love 6.cbz
  ├── Assisted Love 7.cbz
  ├── Assisted Love 7.json
  ├── Assisted Love 8
  │   ├── .faccina
  │   ├── 01.png
  │   ├── 02.png
  │   └── 03.png
  └── Assisted Love.cbz
```

It's important that, entries that are not inside an archive, have anything to anchor them. This can either be a valid metadata file (`info.json`, `info.yaml`, `ComicInfo.xml`) or an empty `.faccina` file inside the folder alongside the images.

#### Images directory

The images property indicates where resampled images should be stored.

These by default includes covers and thumbnails for the pages. Pages can also be resampled for the reader. See an explanation about this in the [images](#images) section.

Here is an example of a typical structure for the images directory:

```text
─ images
  ├── 05c3b7b1bd4540c3
  │   ├── 2b35e7e8
  │   │   └── 1.webp
  │   ├── 2c5cbf52
  │   │   └── 1.jxl
  │   ├── 90521505
  │   │   └── 1.webp
  │   └── fe53d749
  │       └── 1.avif
  ├── 1719931640e60e93
  │   ├── 2b35e7e8
  │   │   └── 01.webp
  │   ├── 2c5cbf52
  │   │   └── 01.jxl
  │   └── fe53d749
  │       └── 01.avif
  └── 1da968a4a127f110
      ├── 2b35e7e8
      │   └── 001.webp
      ├── 2c5cbf52
      │   └── 001.jxl
      └── fe53d749
          └── 001.avif
```

The first level of folders are asociated to an entry in the database and their name corresponds to a hash sum of the contents of the archive.

Every subfolder represents an image preset. See an explanation about this in the [images](#images) section.

### Database

Faccina supports both SQLite and PostgreSQL. I recommend you stick to SQLite since it's more simpler and you don't need to have any extra dependencies. PostgreSQL should only be used if you're having performance issues with SQLite.

This is how you can set Faccina to use a SQLite database:

```toml
[database]
vendor = 'sqlite'
path = './db.sqlite'
```

The path property indicates where the database file and associated WAL files should be stored.

This is how to setup PostgreSQL instead:

```toml
[database]
vendor = 'postgresql'
database = 'faccina'
user = 'admin'
password = 'password'
host = 'localhost'
port = 5432
```

All the properties here are self explanatory if you know how to use PostgreSQL.

### Server

```toml
[server]
logging = true
auto_unpack = false
```

The logging property indicates whether it should display logs in the console or not. You can also change it to a path if you want to store the logs. Example:

```toml
[server]
logging = './server.log'
```

The auto unpack property indictes, when an original image is requested (either by the reader or by the generate images command), if it should save it in the images directory. The use case for this could be if you don't want the server to decompress the images from the original archive everytime the original file is requested.

I don't recommend you to enable this as this feature is not very well polished yet and haven't been thoughtfully tested. A better alternative would be to decompress the archives yourself in the content directory.

### Site

This section involves settings for visual parts of the web app and feature availability for users.

Here is a part of the default configuration:

```toml
[site]
site_name = 'Faccina'
url = ''
enable_users = true
enable_collections = true
enable_read_history = true
admin_users = []
default_sort = 'released_at'
default_order = 'desc'
guest_downloads = true
client_side_downloads = true
search_placeholder = ''
secure_session_cookie = false
```

- Site name indicates the title of the site. You would only need to change this for branding reasons.
- URL is only used for SEO, exported metadata and emails. It's not necessary for a private instance.
- Enable users indicates if users can be registered and login through the web app. You can always generate a unique login link with the CLI command `uli <username>`.
- Enable collections indicates if users can interact with collections: create, edit and view them.
- Enable read history indicates if users' read history should be saved and be accessible.
- Admin users indicates what usernames should be given admin privileges.
- Default sort indicates what the initial sorting should be for normal gallery listings, not including favorites, collections nor series as these will always default to saved at date and order number.
- Default order indicates what order the listing should take by default. This also only applies to normal gallery listings. Favorites will default to descending order while collections and series will default to ascendent order.
- Guest downloads indicates if anonymous not authenticated users can make downloads. This applies to both client and server downloads.
- Search placeholder is used to indicate the placeholder for the main search bar.
- Secure session cookie indicates if the session cookie for users should be marked as secure. This is intended for public instances.

There another two settings inside site

#### Site Admin

```toml
[site.admin]
delete_require_confirmation = true
```

At the moment, only this option is present. Is to indicate whether deleting a gallery from the web app should show a confirmation message.

#### Gallery Listing

There are few settings that affect all gallery listings on the app:

```toml
[site.gallery_listing]
page_limits = [24]
default_page_limit = 24 # defaults to the first one available
tag_weight = []
tag_exclude = []
use_default_tag_weight = true
use_default_tag_exclude = true
```

The first two properties are self explanatory.

##### Tag Weight

There is limited space for every gallery in the listing to show its tags, so you can configure what tag and type of tag will be show first.

By default, tags that are part of the 'artist', 'circle' and 'parody' namespaces will be shown, in that order, before every other type of tag.

Here is how the configuration would look if `use_default_tag_weight` is `true`:

```toml
[[site.gallery_listing.tag_weight]]
namespace = 'artist'
weight = 1000

[[site.gallery_listing.tag_weight]]
namespace = 'circle'
weight = 999

[[site.gallery_listing.tag_weight]]
namespace = 'parody'
weight = 998
```

You can also add your own definition to this array. Example:

```toml
[[site.gallery_listing.tag_weight]]
name = 'vanilla'
weight = 100

[[site.gallery_listing.tag_weight]]
name = ['comedy', 'love hotel']
weight = 150
```

For this example, for the gallery tags, the 'comedy' and 'love hotel' tags will show before the 'vanilla' tag which will be shown before any other tags.

The tag weight object has other properties:

```toml
name = '' # or an array ['']
namespace = ''
weight = 0
ignore_case = false
```

- Name is the name of the tag. You can pass one or an array to affect multiple tags at the same time.
- Namespace is the type/category of a tag, what it makes reference to. By default, Faccina supports 'artist', 'circle', 'magazine', 'event', 'publisher' and 'parody'. Other namespaces can be used but the will be grouped with tags that don't define any namespace: 'tag'.
- Weight is an integer number that indicates how much importance this definition has.
- Ignore case will make it so comparisons for the tag name ignore any casing. 'Comedy' would be treated the same as 'comedy' and 'COMEDY', etc.

##### Tag Exclude

The same way you can specify which tags to show first, you can also specify which task to hide from the gallery listing item. A common example is to hide the common parody tag 'Original' and 'Original Work', and other non-relevant tags like magazine, event or publisher.

Here's how the configuration would look if `use_default_tag_exclude` is `true`:

```toml
[[site.gallery_listing.tag_exclude]]
namespace = 'parody'
name = ['original', 'original work']
ignore_case = true

[[site.gallery_listing.tag_exclude]]
namespace = 'magazine'

[[site.gallery_listing.tag_exclude]]
namespace = 'event'

[[site.gallery_listing.tag_exclude]]
namespace = 'publisher'
```

The same definition of the properties as tag weights applies to tag exclude, with the exception of weight.

### Images
