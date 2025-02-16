package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"
)

type Directories struct {
	Content string `toml:"content"`
	Images  string `toml:"images"`
}

type DatabaseVendor string

const (
	SQLite     DatabaseVendor = "sqlite"
	PostgreSQL DatabaseVendor = "postgresql"
)

type SQLiteConfig struct {
	Path string
}

type PostgreSQLConfig struct {
	Host     string  `toml:"host,omitempty"`
	Port     int     `toml:"port,omitempty"`
	Username *string `toml:"user,omitempty"`
	Password *string `toml:"pass,omitempty"`
	Database string  `toml:"database,omitempty"`
}

type Database struct {
	Vendor DatabaseVendor `toml:"vendor"`
	Config interface{}    `toml:"-"`
}

type Config struct {
	Directories Directories `toml:"directories"`
	Database    Database    `toml:"database"`
	Image       Image       `toml:"image"`
}

type Image struct {
	CoverPreset     string            `toml:"cover_preset"`
	ThumbnailPreset string            `toml:"thumbnail_preset"`
	ReaderPresets   []string          `toml:"reader_presets"`
	Preset          map[string]Preset `toml:"preset"`
	Caching         Caching           `toml:"caching"`
}

type ImageFormat string

const (
	WEBP ImageFormat = "webp"
	JPEG ImageFormat = "jpeg"
	PNG  ImageFormat = "png"
	JXL  ImageFormat = "jxl"
	AVIF ImageFormat = "avif"
)

type Preset struct {
	Format           ImageFormat `toml:"format"`
	Width            *int        `toml:"width,omitempty"`
	Quality          *int        `toml:"quality,omitempty"`
	Lossless         *bool       `toml:"lossless,omitempty"`
	NearLossless     *bool       `toml:"near_lossless,omitempty"`
	Effort           *int        `toml:"effort,omitempty"`
	Progressive      *bool       `toml:"progressive,omitempty"`
	CompressionLevel *int        `toml:"compression_level,omitempty"`
	Distance         *float64    `toml:"distance,omitempty"`
	Label            *string     `toml:"label,omitempty"`
	Hash             string      `toml:"-"`
}

type Caching struct {
	Page      int `toml:"page"`
	Thubmnail int `toml:"thumbnail"`
	Cover     int `toml:"cover"`
}

func (o *SQLiteConfig) UnmarshalTOML(data any) error {
	d, _ := data.(map[string]any)["database"].(map[string]any)

	path, exists := d["path"]
	if !exists || path == nil {
		return fmt.Errorf("SQLite: no path given")
	}

	pathStr, ok := path.(string)
	if !ok || pathStr == "" {
		return fmt.Errorf("SQLite: no path given")
	}

	o.Path = pathStr

	return nil
}

func (o *PostgreSQLConfig) UnmarshalTOML(data any) error {
	d, _ := data.(map[string]any)["database"].(map[string]any)

	host, exists := d["host"]
	if !exists || host == nil {
		return fmt.Errorf("PostgreSQL: no host given")
	}

	hostStr, ok := host.(string)
	if !ok || hostStr == "" {
		return fmt.Errorf("PostgreSQL: no host given")
	}

	o.Host = hostStr

	port, exists := d["port"]
	if !exists || port == nil {
		port = 5432
	}

	o.Port = 5432

	user, exists := d["user"]
	if exists && user != nil {
		if user, ok := user.(string); ok {
			*o.Username = user
		}
	}

	pass, exists := d["pass"]
	if exists && pass != nil {
		if pass, ok := pass.(string); ok {
			*o.Password = pass
		}
	}

	database, exists := d["database"]
	if !exists || database == nil {
		return fmt.Errorf("PostgreSQL: no database given")
	}

	databaseStr, ok := database.(string)
	if !ok || databaseStr == "" {
		return fmt.Errorf("PostgreSQL: no database given")
	}

	o.Database = databaseStr

	return nil
}

func generatePresetHash(p *Preset) string {
	var pairs []string

	pairs = append(pairs, fmt.Sprintf("format:%v", p.Format))

	switch p.Format {
	case WEBP:
		addFieldIfNotNil(&pairs, "quality", p.Quality)
		addFieldIfNotNil(&pairs, "lossless", p.Lossless)
		addFieldIfNotNil(&pairs, "near_lossless", p.NearLossless)
		addFieldIfNotNil(&pairs, "effort", p.Effort)
	case JPEG:
		addFieldIfNotNil(&pairs, "quality", p.Quality)
		addFieldIfNotNil(&pairs, "progressive", p.Progressive)
	case PNG:
		addFieldIfNotNil(&pairs, "png", p.Quality)
		addFieldIfNotNil(&pairs, "progressive", p.Progressive)
		addFieldIfNotNil(&pairs, "effort", p.Effort)
		addFieldIfNotNil(&pairs, "compression_level", p.CompressionLevel)
	case JXL:
		addFieldIfNotNil(&pairs, "quality", p.Quality)
		addFieldIfNotNil(&pairs, "lossless", p.Lossless)
		addFieldIfNotNil(&pairs, "effort", p.Effort)
		addFieldIfNotNil(&pairs, "distance", p.Distance)
	case AVIF:
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

func getConfig() Config {
	defaultPaths := []string{
		"./config.toml",
		"../config.toml",
	}

	var tomlData string
	var usedPath string

	for _, defaultPath := range defaultPaths {
		_content, err := os.ReadFile(defaultPath)

		if err == nil {
			tomlData = string(_content)
			usedPath = defaultPath
			break
		}
	}

	if tomlData == "" {
		panic("Failed to get configuration")
	}

	config := Config{
		Image: Image{
			Caching: Caching{
				Page:      31536000,
				Thubmnail: 172800,
				Cover:     432000,
			},
		},
	}

	_, err := toml.Decode(tomlData, &config)
	checkErr(err)

	if usedPath == "../config.toml" {
		if !filepath.IsAbs(config.Directories.Content) {
			config.Directories.Content = filepath.Join("..", config.Directories.Content)
		}

		if !filepath.IsAbs(config.Directories.Images) {
			config.Directories.Images = filepath.Join("..", config.Directories.Images)
		}
	}

	if config.Image.CoverPreset == "" {
		config.Image.CoverPreset = "cover"
	}

	if config.Image.ThumbnailPreset == "" {
		config.Image.ThumbnailPreset = "thumb"
	}

	switch config.Database.Vendor {
	case SQLite:
		var sqliteConfig SQLiteConfig
		err := toml.Unmarshal([]byte(tomlData), &sqliteConfig)
		checkErr(err)

		if usedPath == "../config.toml" && !filepath.IsAbs(sqliteConfig.Path) {
			sqliteConfig.Path = filepath.Join("..", sqliteConfig.Path)
		}

		config.Database.Config = sqliteConfig
	case PostgreSQL:
		var postgresConfig PostgreSQLConfig
		err := toml.Unmarshal([]byte(tomlData), &postgresConfig)
		checkErr(err)
		config.Database.Config = postgresConfig
	default:
		panic(fmt.Errorf("Unknown database vendor '%s'", config.Database.Vendor))
	}

	if _, exists := config.Image.Preset["cover"]; !exists {
		width := 540
		label := "Cover"
		config.Image.Preset["cover"] = Preset{
			Format: WEBP,
			Width:  &width,
			Label:  &label,
		}
	}

	if _, exists := config.Image.Preset["thumb"]; !exists {
		width := 360
		label := "Thumbnail"
		config.Image.Preset["thumb"] = Preset{
			Format: WEBP,
			Width:  &width,
			Label:  &label,
		}
	}

	for n, p := range config.Image.Preset {
		p.Hash = generatePresetHash(&p)
		config.Image.Preset[n] = p
	}

	return config
}
