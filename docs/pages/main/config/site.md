---
order: 0
title: Site
---

# {title}

Defined by the table header `[site]`.

## Contents

## General configuration

```toml
[site]
site_name = 'Faccina'
enable_users = true
enable_collections = true
enable_read_history = true
admin_users = []
default_sort = 'released_at'
default_order = 'desc'
guest_downloads = true
client_side_downloads = true
search_placeholder = ''
store_og_images = false
secure_session_cookie = true
```

Here's the explanation for what all the properties do:

- `site_name`: This is used to define the site title in the pages and emails.
- `url`: This is used to define meta tags and for email links. By default, this property is not defined.
- `enable_users`: Settings this to `false` will disable login, register and access recovery functionality. If you're autenticated, you can stil access user features.
- `enable_collections`: Settings this to `false` will disable collections functionality on the site.
- `enable_read_history`: Settings this to `false` will disable the reading history on the site. No new read entries will be saved.
- `admin_users`: An array of usernamees to identify what users should be defined as site admins. These users will have admin privileges as long as they're in the array. This data is not saved in the database.
- `default_sort`: Indicates what will be the default sorting for all listings when nothing is specified.
- `default_order`: Indicates what will be the default ordering for all listings when nothing is specified.
- `guest_downloads`: If set to `false`, visitors will require to be authenticated to be able to download galleries.
- `client_side_downloads`: If set to `false`, the download button in gallery pages will trigger a server download. Server downloads will always be available. Client-side downloads help to alleviate resource usage on the server as these images can be cached.
- `search_placeholder`: Indicate what should be the search placeholder for all the main search.
- `store_og_images`: Meta images can be saved to disk but this will make any change to their metadata not be shown until this option is set to `false` or the image is deleted. These images are stored in `{images_dir}/{archive_hash}/_meta/{thumbnail_page}.png`.
- `secure_session_cookie`: A session cookie is used to check whether a user is logged in or not. If the cookie is set to be secure, then the site must be accesed through `localhost` or a secure HTTPS environment. Set this to `false` is this doesn't apply to your setup.

## Gallery listing

This is used to configure how gallery listing and its items will behave.

```toml
[site.gallery_listing]
tag_weight = []
tag_exclude = []
page_limits = [24]
```

- `page_limits`: Array that includes all the available page limit options for all the listings.
- `default_page_limit`: The default option. This is not default by default and it will chose the first one that's available.

### Tag weight

Since there is limited space for the tags inside the list items in gallery listings, this can be used to show some tags before others defined by name, namespace or both.

This is the default configuration:

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

Example:

```toml
[[site.gallery_listing.tag_weight]]
name = "Vanilla"
namespace = "tag"
weight = 20
ignore_case = true
```

This will give the tag "Vanilla" (case ignored) with the namespace "tag" a weight of 20.

You can also define the same weight for multiple tags with one entry:

```toml
[[site.gallery_listing.tag_weight]]
name = ["fantasy", "isekai"]
weight = 50
ignore_case = true
```

This will give the tags "fantasy" and "isekai" from any namespace a weight of 50.
