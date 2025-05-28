package image

import (
	"archive/zip"
	"database/sql"
	. "faccina/.gen/table"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/davidbyttow/govips/v2/vips"
	"github.com/go-jet/jet/v2/qrm"
	. "github.com/go-jet/jet/v2/sqlite"
)

type Preset struct {
	Format           Format   `toml:"format"`
	Width            int      `toml:"width,omitempty"`
	Quality          *int     `toml:"quality,omitempty"`
	Lossless         *bool    `toml:"lossless,omitempty"`
	NearLossless     *bool    `toml:"near_lossless,omitempty"`
	Effort           *int     `toml:"effort,omitempty"`
	Progressive      *bool    `toml:"progressive,omitempty"`
	CompressionLevel *int     `toml:"compression_level,omitempty"`
	Distance         *float64 `toml:"distance,omitempty"`
	Label            string   `toml:"label,omitempty"`
	Hash             string   `toml:"-"`
}

type Format string

const (
	WEBP Format = "webp"
	JPEG Format = "jpeg"
	PNG  Format = "png"
	JXL  Format = "jxl"
	AVIF Format = "avif"
)

type ArchiveImageResult struct {
	Id         int32 `sql:"primary_key"`
	Hash       string
	Path       string
	Pages      int32
	Filename   string
	PageNumber int32
}

// Update missing image dimensions
func handleDimensions(image []byte, archive ArchiveImageResult, db *sql.DB) error {
	stmt := SELECT(ArchiveImages.ArchiveID).
		FROM(ArchiveImages).
		WHERE(
			AND(
				ArchiveImages.ArchiveID.EQ(Int32(archive.Id)),
				ArchiveImages.PageNumber.EQ(Int32(archive.PageNumber)),
				OR(ArchiveImages.Width.IS_NULL(), ArchiveImages.Height.IS_NULL()),
			),
		)

	if _, err := stmt.Exec(db); err != nil && err != qrm.ErrNoRows {
		return err
	}

	vipsImage, err := vips.NewImageFromBuffer(image)
	if err != nil {
		return err
	}
	defer vipsImage.Close()

	width := vipsImage.Width()
	height := vipsImage.Height()

	updateStmt := ArchiveImages.
		UPDATE(ArchiveImages.Width, ArchiveImages.Height).
		SET(width, height).
		WHERE(
			AND(
				ArchiveImages.ArchiveID.EQ(Int32(archive.Id)),
				ArchiveImages.PageNumber.EQ(Int32(archive.PageNumber)),
			),
		)

	_, err = updateStmt.Exec(db)
	if err != nil {
		return err
	}

	return nil
}

// Encodes an image with the given preset
func EncodeImage(vipsImage *vips.ImageRef, p Preset, aspectRatioSimilar bool) ([]byte, error) {
	if p.Width > 0 {
		aspectRatio := float64(vipsImage.Width()) / float64(vipsImage.Height())

		var err error

		if aspectRatioSimilar && aspectRatio >= 0.65 && aspectRatio <= 0.75 {
			height := p.Width * 64.0 / 45.0
			err = vipsImage.Thumbnail(p.Width, int(height), vips.InterestingCentre)
		} else {
			err = vipsImage.Thumbnail(p.Width, int(float64(p.Width)/aspectRatio), vips.InterestingCentre)
		}

		if err != nil {
			return nil, err
		}
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

		newImg, _, err := vipsImage.ExportWebp(ep)
		return newImg, err
	case JPEG:
		ep := vips.NewJpegExportParams()

		if p.Quality != nil {
			ep.Quality = *p.Quality
		}

		if p.Progressive != nil {
			ep.Interlace = *p.Progressive
		}

		newImg, _, err := vipsImage.ExportJpeg(ep)
		return newImg, err
	case PNG:
		ep := vips.NewPngExportParams()

		if p.Progressive != nil {
			ep.Interlace = *p.Progressive
		}

		if p.CompressionLevel != nil {
			ep.Compression = *p.CompressionLevel
		}

		newImg, _, err := vipsImage.ExportPng(ep)
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

		newImg, _, err := vipsImage.ExportJxl(ep)
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

		newImg, _, err := vipsImage.ExportAvif(ep)
		return newImg, err
	default:
		return nil, fmt.Errorf("invalid preset format %s", p.Format)
	}
}

func GetEncodedImage(archive ArchiveImageResult, preset Preset, aspectRatioSimilar bool, storeResampledImages bool, imagesDir string, db *sql.DB) ([]byte, error) {
	imagePath := filepath.Join(
		Directory(archive.Hash, imagesDir),
		preset.Hash,
		fmt.Sprintf("%s.%s", PageFilename(archive.PageNumber, archive.Pages), preset.Format),
	)

	f, err := os.Open(imagePath)
	if err != nil {
		slog.Warn(fmt.Sprintf("failed to open existing image: %v", err.Error()))
	} else {
		defer f.Close()
		return io.ReadAll(f)
	}

	path, err := resolveSymlinks(archive.Path)
	if err != nil {
		return nil, err
	}

	fi, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	if fi.IsDir() {
		imagePath := filepath.Join(archive.Path, archive.Filename)

		f, err := os.Open(imagePath)
		if err != nil {
			return nil, err
		}
		defer f.Close()

		vipsImage, err := vips.NewImageFromReader(f)
		if err != nil {
			return nil, err
		}
		defer vipsImage.Close()

		b, err := EncodeImage(vipsImage, preset, aspectRatioSimilar)
		if err != nil {
			return nil, err
		}

		if storeResampledImages {
			err := Save(imagePath, b)
			if err != nil {
				slog.Warn(err.Error())
			}
		}

		err = handleDimensions(b, archive, db)
		if err != nil {
			slog.Warn(fmt.Sprintf("failed to handle dimensions: %v", err))
		}

		return b, nil
	} else {
		r, err := zip.OpenReader(archive.Path)
		if err != nil {
			return nil, err
		}

		defer r.Close()

		f, err := r.Open(archive.Filename)
		if err != nil {
			return nil, err
		}
		defer f.Close()

		vipsImage, err := vips.NewImageFromReader(f)
		if err != nil {
			return nil, err
		}
		defer vipsImage.Close()

		b, err := EncodeImage(vipsImage, preset, aspectRatioSimilar)
		if err != nil {
			return nil, err
		}

		if storeResampledImages {
			err := Save(imagePath, b)
			if err != nil {
				slog.Warn(err.Error())
			}
		}

		err = handleDimensions(b, archive, db)
		if err != nil {
			slog.Warn(fmt.Sprintf("failed to handle dimensions: %v", err))
		}

		return b, nil
	}
}

func GetOriginalImage(archive ArchiveImageResult, imagesDir string, db *sql.DB) ([]byte, error) {
	imagePath := filepath.Join(
		Directory(archive.Hash, imagesDir),
		fmt.Sprintf("%s%s", PageFilename(archive.PageNumber, archive.Pages), filepath.Ext(archive.Filename)),
	)

	f, err := os.Open(imagePath)
	if err != nil {
		slog.Warn(fmt.Sprintf("failed to open unpacked image: %v", err.Error()))
	} else {
		defer f.Close()
		return io.ReadAll(f)
	}

	path, err := resolveSymlinks(archive.Path)
	if err != nil {
		return nil, err
	}

	fi, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	if fi.IsDir() {
		f, err := os.Open(filepath.Join(archive.Path, archive.Filename))
		if err != nil {
			return nil, err
		}
		defer f.Close()

		b, err := io.ReadAll(f)
		if err != nil {
			return nil, err
		}

		err = handleDimensions(b, archive, db)
		if err != nil {
			slog.Warn(fmt.Sprintf("failed to handle dimensions: %v", err))
		}

		return b, nil
	} else {
		r, err := zip.OpenReader(archive.Path)
		if err != nil {
			return nil, err
		}
		defer r.Close()

		f, err := r.Open(archive.Filename)
		if err != nil {
			return nil, err
		}
		defer f.Close()

		b, err := io.ReadAll(f)
		if err != nil {
			return nil, err
		}

		err = handleDimensions(b, archive, db)
		if err != nil {
			slog.Warn(fmt.Sprintf("failed to handle dimensions: %v", err))
		}

		return b, nil
	}
}
