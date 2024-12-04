bun install && bun run build
rm -rf compile && mkdir compile
bunx make-vfs --dir ./build/client --content-format import-bunfile --outfile compile/client-routes.ts
bun build --outfile faccina --minify --sourcemap --external=sharp --external=uglify-js --compile ./entrypoint.ts