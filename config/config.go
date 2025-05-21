package config

import (
	"os"

	"github.com/BurntSushi/toml"
)

type Config struct {
	Directories Directories `toml:"directories"`
	Database    Database    `toml:"database"`
	Server      Server      `toml:"server"`
	Site        Site        `toml:"site"`
	Image       Image       `toml:"image"`
	Mailer      *Mailer     `toml:"mailer,omitempty"`
}

func LoadConfig(path string) (*Config, error) {
	bytes, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	config := &Config{}
	setDirectoriesDefault(config)
	setServerDefaults(config)
	setSiteDefaults(config)
	setImageDefaults(config)

	if err = toml.Unmarshal(bytes, config); err != nil {
		return nil, err
	}

	if err = loadDirectoriesConfig(config); err != nil {
		return nil, err
	}

	if err = loadDatabaseConfig(bytes, config); err != nil {
		return nil, err
	}

	if err = loadSiteConfig(config); err != nil {
		return nil, err
	}

	if err = loadImageConfig(config); err != nil {
		return nil, err
	}

	return config, nil
}
