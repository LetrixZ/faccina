---
order: 1
title: Installation
---

<script context="module">
  import { base } from "$app/paths";
</script>

# {title}

## Pre-requisites

Bun is required to run the CLI and the web server. You can get the latest version from [here](https://bun.sh).

You might need a PostgreSQL server, unless you configure the app to use SQLite.

There is a Docker Compose setup ready if you don't want to install anything in your system.

## Setup

You will first need to get the source code since it includes the app itself and the Docker files. You can use Git to clone the [repository](https://github.com/LetrixZ/faccina) or download it as a [ZIP archive](https://github.com/LetrixZ/faccina/archive/refs/heads/main.zip).

### Local setup

Open a terminal in the root of the repository, where the `package.json` file is located and, with Bun already installed, run `bun install`. This will install all the necessary dependencies.

Now, make a copy of the example configuration file and name it `config.toml`. This includes the basics for the app to work. For a more in-depth explanation of the configuration, check [this page]({base}/main/config).

```toml
[site]
site_name = 'Faccina'

[directories]
content = "./content"
images = "./images"

[database]
vendor = 'sqlite'
path = './db.sqlite'
```

You will first need to configure a database connection. The example configuration already specifies a connection using SQLite. It will create the database in the path `./db.sqlite`.

To configure a PostgreSQL connection use this config:

```toml
[database]
vendor = 'postgres' # Specify 'postgres' vendor
database = 'faccina' # Database name
user = 'faccina' # Database owner username
password = 'facicna' # Database owner password
host = 'postgres' # Database host
port = 5432 # Database port
```

To continue, run `bun run build` to build the app. This will compile the web app. The build files are located in the `./build` directory.

Finally, start the web server with `bun start`.

By default, it will be available at `0.0.0.0:3000`. You can change the hostname and the port by setting the environment variables `HOST` and `PORT`. Example: `HOST=127.0.0.1 PORT=8080 bun start`.

You can also start the server in cluster mode so it takes advantage of multi-core CPUs. Use `bun run cluster`. This currently only works on Linux.

### Docker setup

Copy the example Compose file to `./docker-compose.yaml` or `compose.yaml`. Now change the volume configuration to point to where the content is and where the images should be stored.

This setup uses PostgreSQL as its database. It uses the configuration file from `./config.docker.toml`.

Now, run `docker compose up` to start everything. It will be available at `0.0.0.0:3000`.

## Next step

You can now go through the rest of the configuration [here]({base}/main/config) or you can start by learning [how to index archives]({base}/cli/index-archives).
