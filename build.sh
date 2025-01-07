bun run build \
&& mkdir -p compile \ 
&& bunx make-vfs --dir ./build/client --content-format import-bunfile --outfile compile/client-routes.ts \
&& bun ./embed-sharp.ts \
&& bun build --outfile faccina --minify --sourcemap --compile ./entrypoint.ts
