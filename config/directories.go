package config

import "path/filepath"

type Directories struct {
	Content string `toml:"content"`
	Images  string `toml:"images"`
}

func setDirectoriesDefault(config *Config) {
	config.Directories = Directories{
		Content: "./content",
		Images:  "./images",
	}
}

func loadDirectoriesConfig(config *Config) error {
	contentAbsolute, err := filepath.Abs(config.Directories.Content)
	if err != nil {
		return err
	}

	imagesAbsolute, err := filepath.Abs(config.Directories.Images)
	if err != nil {
		return err
	}

	config.Directories.Content = contentAbsolute
	config.Directories.Images = imagesAbsolute

	return nil
}
