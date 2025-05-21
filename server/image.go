package server

import (
	"database/sql"
	"errors"
	"faccina/config"
	. "faccina/gen/table"
	"faccina/image"
	. "faccina/lib"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gabriel-vasile/mimetype"
	"github.com/go-jet/jet/v2/qrm"
	. "github.com/go-jet/jet/v2/sqlite"
)

func setImageCache(imageType string, caching config.Caching, w http.ResponseWriter) {
	switch imageType {
	case "cover":
		if caching.Cover > 0 {
			w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d, immutable", caching.Cover))
		}
	case "thumb":
		if caching.Thumbnail > 0 {
			w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d, immutable", caching.Thumbnail))
		}
	case "":
		if caching.Page > 0 {
			w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d, immutable", caching.Page))
		}
	}
}

func getImage(hash string, page int32, imageType string, db *sql.DB, config *config.Config) ([]byte, error) {
	stmt := SELECT(
		Archives.ID.AS("archive_image_result.id"),
		Archives.Hash.AS("archive_image_result.hash"),
		Archives.Path.AS("archive_image_result.path"),
		Archives.Pages.AS("archive_image_result.pages"),
		ArchiveImages.Filename.AS("archive_image_result.filename"),
		ArchiveImages.PageNumber.AS("archive_image_result.page_number"),
	).
		FROM(Archives.INNER_JOIN(ArchiveImages, ArchiveImages.ArchiveID.EQ(Archives.ID))).
		WHERE(
			AND(
				Archives.Hash.EQ(String(hash)),
				ArchiveImages.PageNumber.EQ(Int32(int32(page))),
			),
		)

	var archive image.ArchiveImageResult
	err := stmt.Query(db, &archive)
	if err != nil {
		if err == qrm.ErrNoRows {
			return nil, StatusError{404, errors.New("Archive image not found")}
		}
		return nil, err
	}

	if imageType == "" {
		return image.GetOriginalImage(archive, config.Directories.Images, db)
	} else {
		var preset *image.Preset

		switch imageType {
		case "cover":
			if config.Image.CoverPreset != "" {
				preset = image.GetPreset(config.Image.CoverPreset, config.Image.Preset)
			} else {
				preset = &config.Image.DefaultCoverPreset
			}
		case "thumb":
			if config.Image.ThumbnailPreset != "" {
				preset = image.GetPreset(config.Image.ThumbnailPreset, config.Image.Preset)
			} else {
				preset = &config.Image.DefaultThumbnailPreset
			}
		default:
			preset = image.GetPreset(imageType, config.Image.Preset)
		}

		if preset == nil {
			return nil, StatusError{400, fmt.Errorf("Preset '%s' not found", imageType)}
		}

		return image.GetEncodedImage(
			archive,
			*preset,
			config.Image.AspectRatioSimilar && (imageType == "cover" || imageType == "thumb"),
			config.Image.StoreResampledImages,
			config.Directories.Images,
			db,
		)
	}
}

func imageHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	hash := r.PathValue("hash")
	pageValue := r.PathValue("page")

	page, err := strconv.Atoi(pageValue)
	if err != nil {
		return StatusError{400, fmt.Errorf("Invalid page number given: %s", pageValue)}
	}

	imageType := r.URL.Query().Get("type")

	data, err := getImage(hash, int32(page), imageType, state.DB, state.Config)
	if err != nil {
		return err
	}

	setImageCache(imageType, state.Config.Image.Caching, w)

	mtype := mimetype.Detect(data)
	w.Header().Set("Content-Type", mtype.String())
	w.Write(data)
	return nil
}
