// https://www.liip.ch/en/blog/embed-sveltekit-into-a-go-binary
package web

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"strings"
)

//go:generate pnpm install
//go:generate pnpm build
//go:embed all:build
var files embed.FS

func SvelteKitHandler() http.Handler {
	fsys, err := fs.Sub(files, "build")
	if err != nil {
		log.Fatal(err)
	}
	filesystem := http.FS(fsys)
	_ = filesystem

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if !strings.HasPrefix(path, "/_") && !strings.HasSuffix(path, "__data.json") {
			path = ""
		}

		r.URL.Path = path
		http.FileServer(filesystem).ServeHTTP(w, r)
	})
}
