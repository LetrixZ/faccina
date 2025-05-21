package image

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

// Returns padded image filename
func PageFilename(page int32, pages int32) string {
	return fmt.Sprintf("%0*d", len(strconv.Itoa(int(pages))), page)
}

// Saves image to disk
func Save(path string, contents []byte) error {
	err := os.MkdirAll(filepath.Dir(path), os.ModePerm)

	if err != nil {
		return fmt.Errorf("failed to create directory: %s", err)
	}

	err = os.WriteFile(path, contents, 0644)

	if err != nil {
		return fmt.Errorf("failed to write file: %s", err)
	}

	return nil
}

// Returns correct directory structure
func Directory(hash string, baseDir string) string {
	return filepath.Join(baseDir, hash[0:2], hash[2:4], hash)
}

// Get preset by name
func GetPreset(name string, presets map[string]Preset) *Preset {
	for n, p := range presets {
		if name == n || name == p.Hash {
			return &p
		}
	}

	return nil
}

// Resolve symbolic links to an absolute path
func resolveSymlinks(path string) (string, error) {
	resolved, err := filepath.EvalSymlinks(path)
	if err != nil {
		return "", err
	}

	return filepath.Abs(resolved)
}
