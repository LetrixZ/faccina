package shared

import (
	"faccina/config"
	"faccina/image"
	"faccina/util"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
)

// TODO: Check if it works
func migrateImagesSubHashDirectory(config *config.Config) error {
	entries, err := os.ReadDir(config.Directories.Images)
	if err != nil {
		return err
	}

	var filtered []os.DirEntry

	for _, entry := range entries {
		if len(entry.Name()) > 2 && entry.IsDir() {
			filtered = append(filtered, entry)
		}
	}

	if len(filtered) == 0 {
		return nil
	}

	slog.Info(fmt.Sprintf("Found %d archive image folders to migrate to new structure", len(filtered)))

	for _, entry := range filtered {
		hash := entry.Name()
		oldPath := filepath.Join(config.Directories.Images, hash)
		newPath := image.Directory(hash, config.Directories.Images)

		if !util.DirExists(newPath) {
			err := os.Mkdir(newPath, os.ModeDir)
			if err != nil {
				return err
			}
		}

		err := filepath.Walk(oldPath, func(file string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			relPath, err := filepath.Rel(oldPath, file)
			if err != nil {
				return err
			}

			if relPath == "." {
				return nil
			}

			newFilePath := filepath.Join(newPath, relPath)

			if info.IsDir() {
				return os.MkdirAll(newFilePath, os.ModePerm)
			}

			if err := os.MkdirAll(filepath.Dir(newFilePath), os.ModePerm); err != nil {
				return err
			}

			return os.Rename(file, newFilePath)
		})

		if err != nil {
			return fmt.Errorf("Error walking the path: %v", err)
		}

		if err := os.RemoveAll(oldPath); err != nil {
			return fmt.Errorf("Error removing old path: %v\n", err)
		}
	}

	return nil
}
