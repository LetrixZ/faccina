package main

import (
	"archive/zip"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/davidbyttow/govips/v2/vips"
	"github.com/gabriel-vasile/mimetype"
	"github.com/gorilla/mux"
	"github.com/stephenafamo/bob"
	"github.com/stephenafamo/bob/dialect/sqlite"
	"github.com/stephenafamo/bob/dialect/sqlite/sm"
	"github.com/stephenafamo/scan"
	_ "modernc.org/sqlite"
)

type Archive struct {
	ID         int    `db:"id"`
	Hash       string `db:"hash"`
	Path       string `db:"path"`
	Pages      int    `db:"pages"`
	Filename   string `db:"filename"`
	PageNumber int    `db:"page_number"`
}

type State struct {
	config *Config
	db     *bob.DB
}

func encodeImage(img *vips.ImageRef, p *Preset) ([]byte, error) {
	if p.Width != nil {
		err := img.Resize(float64(*p.Width)/float64(img.Width()), vips.KernelAuto)
		checkErr(err)
	}

	switch p.Format {
	case WEBP:
		ep := vips.NewWebpExportParams()

		if p.Quality != nil {
			ep.Quality = *p.Quality
		}

		if p.Lossless != nil {
			ep.Lossless = *p.Lossless
		}

		if p.NearLossless != nil {
			ep.NearLossless = *p.NearLossless
		}

		if p.Effort != nil {
			ep.ReductionEffort = *p.Effort
		}

		newImg, _, err := img.ExportWebp(ep)
		return newImg, err
	case JPEG:
		ep := vips.NewJpegExportParams()

		if p.Quality != nil {
			ep.Quality = *p.Quality
		}

		if p.Progressive != nil {
			ep.Interlace = *p.Progressive
		}

		newImg, _, err := img.ExportJpeg(ep)
		return newImg, err
	case PNG:
		ep := vips.NewPngExportParams()

		if p.Progressive != nil {
			ep.Interlace = *p.Progressive
		}

		if p.CompressionLevel != nil {
			ep.Compression = *p.CompressionLevel
		}

		newImg, _, err := img.ExportPng(ep)
		return newImg, err
	case JXL:
		ep := vips.NewJxlExportParams()

		if p.Quality != nil {
			ep.Quality = *p.Quality
		}

		if p.Effort != nil {
			ep.Effort = *p.Effort
		}

		if p.Distance != nil {
			ep.Distance = *p.Distance
		}

		newImg, _, err := img.ExportJxl(ep)
		return newImg, err
	case AVIF:
		ep := vips.NewAvifExportParams()

		if p.Quality != nil {
			ep.Quality = *p.Quality
		}

		if p.Lossless != nil {
			ep.Lossless = *p.Lossless
		}

		if p.Effort != nil {
			ep.Effort = *p.Effort
		}

		newImg, _, err := img.ExportAvif(ep)
		return newImg, err
	default:
		return nil, fmt.Errorf("invalid preset format %s", p.Format)
	}
}

func ImageHandler(state *State) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		archiveHash := mux.Vars(r)["hash"]
		page := mux.Vars(r)["page"]

		pageNumber, err := strconv.Atoi(page)

		if err != nil {
			checkErrResponse(fmt.Sprintf("Invalid page number given: %s", page), 400, err, w)
			return
		}

		presetType := r.URL.Query().Get("type")

		q := sqlite.Select(
			sm.From("archives"),
			sm.InnerJoin("archive_images").OnEQ(sqlite.Quote("archive_images", "archive_id"), sqlite.Quote("archives", "id")),
			sm.Columns("id", "hash", "path", "pages", "filename", "page_number"),
			sm.Where(sqlite.Quote("hash").EQ(sqlite.Arg(archiveHash))),
			sm.Where(sqlite.Quote("archive_images", "page_number").EQ(sqlite.Arg(pageNumber))),
		)

		archive, err := bob.One(r.Context(), state.db, q, scan.StructMapper[Archive]())

		if err != nil {
			checkErrResponse("Archive not found", 404, err, w)
			return
		}

		fi, err := os.Stat(archive.Path)

		if err != nil {
			checkErrResponse("Failed to read archive", 500, err, w)
			return
		}

		isFile := fi.Mode().IsRegular()

		if presetType == "" {
			imagePath := filepath.Join(imageDirectory(archive.Hash, *state.config), fmt.Sprintf("%s.%s", leadingZeros(archive.PageNumber, archive.Pages), filepath.Ext(archive.Filename)))

			f, err := os.Open(imagePath)

			if err == nil {
				defer f.Close()

				b, err := io.ReadAll(f)

				if err != nil {
					checkErrResponse("Failed to open image", 400, err, w)
					return
				}

				mtype := mimetype.Detect(b)
				w.Header().Set("Content-Type", mtype.String())
				w.Write(b)
				return
			}

			if isFile {
				zipArchive, err := zip.OpenReader(archive.Path)

				if err != nil {
					checkErrResponse("Failed to read archive", 500, err, w)
					return
				}

				defer zipArchive.Close()

				f, err := zipArchive.Open(archive.Filename)

				if err != nil {
					checkErrResponse("Failed to read archive", 500, err, w)
				}

				defer f.Close()

				b, err := io.ReadAll(f)

				if err != nil {
					checkErrResponse("Failed to open image", 500, err, w)
				}

				mtype := mimetype.Detect(b)
				w.Header().Set("Content-Type", mtype.String())
				w.Write(b)
				return
			} else {
				imagePath := filepath.Join(archive.Path, archive.Filename)

				f, err := os.Open(imagePath)

				if err != nil {
					checkErrResponse("Failed to open image", 400, err, w)
					return
				}

				defer f.Close()

				b, err := io.ReadAll(f)

				if err != nil {
					checkErrResponse("Failed to open image", 400, err, w)
					return
				}

				mtype := mimetype.Detect(b)
				w.Header().Set("Content-Type", mtype.String())
				w.Write(b)
				return
			}
		} else {

			var preset *Preset

			for n, p := range state.config.Image.Preset {
				if presetType == n || presetType == p.Hash {
					preset = &p
					break
				}
			}

			if preset == nil {
				checkErrResponse(fmt.Sprintf("Preset '%s' not found", presetType), 400, err, w)
				return
			}

			imagePath := filepath.Join(imageDirectory(archive.Hash, *state.config), preset.Hash, fmt.Sprintf("%s.%s", leadingZeros(archive.PageNumber, archive.Pages), preset.Format))

			f, err := os.Open(imagePath)

			if err == nil {
				defer f.Close()

				b, err := io.ReadAll(f)

				if err != nil {
					checkErrResponse("Failed to open image", 400, err, w)
					return
				}

				mtype := mimetype.Detect(b)
				w.Header().Set("Content-Type", mtype.String())
				w.Write(b)
				return
			}

			if isFile {
				zipArchive, err := zip.OpenReader(archive.Path)

				if err != nil {
					checkErrResponse("Failed to read archive", 500, err, w)
					return
				}

				defer zipArchive.Close()

				f, err := zipArchive.Open(archive.Filename)

				if err != nil {
					checkErrResponse("Failed to read archive", 500, err, w)
				}

				defer f.Close()

				img, err := vips.NewImageFromReader(f)

				if err != nil {
					checkErrResponse("Failed to open image", 500, err, w)
					return
				}

				defer img.Close()

				newImg, err := encodeImage(img, preset)

				if err != nil {
					checkErrResponse("Failed to encode image", 500, err, w)
					return
				}

				mtype := mimetype.Detect(newImg)
				w.Header().Set("Content-Type", mtype.String())
				w.Write(newImg)

				if state.config.Image.StoreResampledImages {
					saveFile(imagePath, newImg)
				}

				return
			} else {
				imagePath := filepath.Join(archive.Path, archive.Filename)

				f, err := os.Open(imagePath)

				if err != nil {
					checkErrResponse("Failed to open image", 400, err, w)
					return
				}

				defer f.Close()

				img, err := vips.NewImageFromReader(f)

				if err != nil {
					checkErrResponse("Failed to open image", 500, err, w)
					return
				}

				defer img.Close()

				newImg, err := encodeImage(img, preset)

				if err != nil {
					checkErrResponse("Failed to encode image", 500, err, w)
					return
				}

				mtype := mimetype.Detect(newImg)
				w.Header().Set("Content-Type", mtype.String())
				w.Write(newImg)

				if state.config.Image.StoreResampledImages {
					saveFile(imagePath, newImg)
				}

				return
			}
		}
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.RequestURI)
		next.ServeHTTP(w, r)
	})
}

func main() {
	vips.LoggingSettings(nil, 0)
	vips.Startup(nil)
	defer vips.Shutdown()

	log.SetFlags(log.LstdFlags | log.Lshortfile)

	config := getConfig()

	db := getDB(&config)

	state := State{
		config: &config,
		db:     &db,
	}

	r := mux.NewRouter()
	r.HandleFunc("/image/{hash}/{page}", ImageHandler(&state))
	r.Use(loggingMiddleware)
	http.Handle("/", r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	log.Printf("listening on port %s", port)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
