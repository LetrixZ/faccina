# Faccina • Web

## Configuration

You need to configure the following environment variables:

- `SERVER_URL`: the **internal** URL where the server is hosted. This can be internal as it will only be used by the web server locally.
- `CDN_URL` the **public** URL where the server is hosted. This will be used to load images so it needs to be publicly accesible to users.

## Building

#### Requirements

- Bun: https://bun.sh/

Steps:

- `bun install` to install dependencies.
- `bun run build` to build the web project.
- `bun ./dist/index.js` to run the generated files.
