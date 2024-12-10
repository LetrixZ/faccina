bun install && bun run build && \
rm -rf compile && mkdir compile && \
bunx make-vfs --dir ./build/client --content-format import-bunfile --outfile compile/client-routes.ts && 
bun build --outfile faccina --minify --sourcemap --external=sharp --compile ./entrypoint.ts && \
zip faccina.zip faccina node_modules/sharp node_modules/@img node_modules/color node_modules/color-convert node_modules/color-name node_modules/color-string node_modules/is-arrayish node_modules/simple-swizzle
