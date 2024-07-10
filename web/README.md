# Faccina • Web

## Configuration

Environment variables:

- `SERVER_URL`: the **internal** URL where the server is hosted. This can be internal as it will only be used by the web server locally.
- `PUBLIC_CDN_URL` the **public** URL where the server is hosted. This will be used to load images so it needs to be publicly accesible to users.
- `API_KEY`: a key used to protect API routes. Leave empty to keep them public.

## Building

#### Requirements

- Bun: https://bun.sh/

Steps:

- Run `bun install` to install dependencies.
- Then, run `bun run build` to build the web app.
- Finally, use `bun ./dist/index.js` to start the web server.
