bun install && bun run build && \
rm -rf compile && mkdir compile && \
bunx make-vfs --dir ./build/client --content-format import-bunfile --outfile compile/client-routes.ts && 
bun ./embed-sharp.ts &&
bun build --outfile faccina --minify --sourcemap --compile ./entrypoint.ts
