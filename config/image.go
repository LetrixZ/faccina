package config

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"faccina/image"
	"fmt"
	"reflect"
)

type Image struct {
	CoverPreset            string                  `toml:"cover_preset,omitempty"`
	ThumbnailPreset        string                  `toml:"thumbnail_preset,omitempty"`
	AspectRatioSimilar     bool                    `toml:"aspect_ratio_similar"`
	RemoveOnUpdate         bool                    `toml:"remove_on_update"`
	Preset                 map[string]image.Preset `toml:"preset"`
	ReaderPresets          []string                `toml:"reader_presets,omitempty"`
	ReaderDefaultPreset    string                  `toml:"reader_default_preset,omitempty"`
	ReaderAllowOriginal    bool                    `toml:"reader_allow_original"`
	DownloadPresets        []string                `toml:"download_presets,omitempty"`
	DownloadDefaultPreset  string                  `toml:"download_default_preset,omitempty"`
	DownloadAllowOriginal  bool                    `toml:"download_allow_original"`
	StoreResampledImages   bool                    `toml:"store_resampled_images"`
	Caching                Caching                 `toml:"caching"`
	DefaultCoverPreset     image.Preset            `toml:"-"`
	DefaultThumbnailPreset image.Preset            `toml:"-"`
}

type Caching struct {
	Page      int `toml:"page"`
	Thumbnail int `toml:"thumbnail"`
	Cover     int `toml:"cover"`
}

type CachingValue struct {
	Value *Caching
}

var defaultCaching = Caching{
	Page:      365 * 24 * 3600,
	Thumbnail: 2 * 24 * 3600,
	Cover:     5 * 24 * 3600,
}

var defaultCoverPreset = image.Preset{
	Width:  540,
	Format: image.WEBP,
	Label:  "Cover",
}

var defaultThumbnailPreset = image.Preset{
	Width:  360,
	Format: image.WEBP,
	Label:  "Thumbnail",
}

func (c *Caching) UnmarshalTOML(data any) error {
	switch v := data.(type) {
	case bool:
		if !v {
			*c = Caching{}
		}
	case int64:
		val := int(v)
		*c = Caching{
			Page:      val,
			Thumbnail: val,
			Cover:     val,
		}
	case map[string]any:
		*c = defaultCaching

		if val, ok := v["page"].(int64); ok {
			c.Page = int(val)
		} else if val, ok := v["page"].(bool); ok {
			if !val {
				c.Page = 0
			}
		}

		if val, ok := v["thumbnail"].(int64); ok {
			c.Thumbnail = int(val)
		} else if val, ok := v["thumbnail"].(bool); ok {
			if !val {
				c.Thumbnail = 0
			}
		}

		if val, ok := v["cover"].(int64); ok {
			c.Cover = int(val)
		} else if val, ok := v["cover"].(bool); ok {
			if !val {
				c.Cover = 0
			}
		}
	default:
		return fmt.Errorf("unsupported type for caching: %v", reflect.TypeOf(data))
	}

	return nil
}

func addFieldIfNotNil(fields *[]string, k string, value any) {
	switch v := value.(type) {
	case *int:
		if v != nil {
			*fields = append(*fields, fmt.Sprintf("%s:%v", k, *v))
		}
	case int:
		if v > 0 {
			*fields = append(*fields, fmt.Sprintf("%s:%v", k, v))
		}
	case *bool:
		if v != nil {
			*fields = append(*fields, fmt.Sprintf("%s:%v", k, *v))
		}
	case *string:
		if v != nil {
			*fields = append(*fields, fmt.Sprintf("%s:%s", k, *v))
		}
	case string:
		if v != "" {
			*fields = append(*fields, fmt.Sprintf("%s:%s", k, v))
		}
	}
}

func generatePresetHash(p *image.Preset) string {
	var pairs []string

	pairs = append(pairs, fmt.Sprintf("format:%v", p.Format))

	switch p.Format {
	case image.WEBP:
		addFieldIfNotNil(&pairs, "quality", p.Quality)
		addFieldIfNotNil(&pairs, "lossless", p.Lossless)
		addFieldIfNotNil(&pairs, "near_lossless", p.NearLossless)
		addFieldIfNotNil(&pairs, "effort", p.Effort)
	case image.JPEG:
		addFieldIfNotNil(&pairs, "quality", p.Quality)
		addFieldIfNotNil(&pairs, "progressive", p.Progressive)
	case image.PNG:
		addFieldIfNotNil(&pairs, "png", p.Quality)
		addFieldIfNotNil(&pairs, "progressive", p.Progressive)
		addFieldIfNotNil(&pairs, "effort", p.Effort)
		addFieldIfNotNil(&pairs, "compression_level", p.CompressionLevel)
	case image.JXL:
		addFieldIfNotNil(&pairs, "quality", p.Quality)
		addFieldIfNotNil(&pairs, "lossless", p.Lossless)
		addFieldIfNotNil(&pairs, "effort", p.Effort)
		addFieldIfNotNil(&pairs, "distance", p.Distance)
	case image.AVIF:
		addFieldIfNotNil(&pairs, "quality", p.Quality)
		addFieldIfNotNil(&pairs, "lossless", p.Lossless)
		addFieldIfNotNil(&pairs, "effort", p.Effort)
	}

	addFieldIfNotNil(&pairs, "width", p.Width)

	hasher := sha256.New()

	for _, pair := range pairs {
		hasher.Write([]byte(pair))
	}

	hashBytes := hasher.Sum(nil)

	return hex.EncodeToString(hashBytes)[0:8]
}

func setImageDefaults(config *Config) {
	config.Image.RemoveOnUpdate = true
	config.Image.AspectRatioSimilar = true
	config.Image.ReaderAllowOriginal = true
	config.Image.DownloadAllowOriginal = true
	config.Image.StoreResampledImages = true
	config.Image.Preset = make(map[string]image.Preset)
	config.Image.Caching = defaultCaching
	config.Image.DefaultCoverPreset = defaultCoverPreset
	config.Image.DefaultThumbnailPreset = defaultThumbnailPreset

	config.Image.DefaultCoverPreset.Hash = generatePresetHash(&config.Image.DefaultCoverPreset)
	config.Image.DefaultThumbnailPreset.Hash = generatePresetHash(&config.Image.DefaultThumbnailPreset)
}

func loadImageConfig(config *Config) error {
	var err error
	for name := range config.Image.Preset {
		if name == "cover" || name == "thumb" {
			err = errors.Join(err, fmt.Errorf("preset name '%s' is not allowed", name))
		}
	}

	for name, preset := range config.Image.Preset {
		if preset.Label == "" {
			preset.Label = name
		}

		preset.Hash = generatePresetHash(&preset)
		config.Image.Preset[name] = preset
	}

	return err
}
