package util

import (
	"errors"
	"os"
)

var (
	GalleryNotFound = errors.New("Gallery not found")
)

func DirExists(path string) bool {
	_, err := os.Stat(path)
	if err == nil {
		return true
	}
	if os.IsNotExist(err) {
		return false
	}
	return false
}
