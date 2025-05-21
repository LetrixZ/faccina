package data

import (
	"faccina/config"
	"slices"
	"strings"
)

func getTagWeight(tag Tag, weights []config.TagWeight) int {
	for _, w := range weights {
		if len(w.Name) > 0 {
			normalizedTagName := tag.Name
			normalizedNames := w.Name

			if w.IgnoreCase {
				normalizedTagName = strings.ToLower(tag.Name)
				normalizedNames = make([]string, len(w.Name))
				for i, n := range w.Name {
					normalizedNames[i] = strings.ToLower(n)
				}
			}

			if w.Namespace != "" {
				if w.Namespace == tag.Namespace && slices.Contains(normalizedNames, normalizedTagName) {
					return w.Weight
				}
			} else if slices.Contains(normalizedNames, normalizedTagName) {
				return w.Weight
			}
		} else if w.Namespace != "" && w.Namespace == tag.Namespace {
			return w.Weight
		}
	}

	return 0
}

func handleTags(tags []Tag, config *config.Config) []Tag {
	excludes := config.Site.GalleryListing.TagExclude
	weights := config.Site.GalleryListing.TagWeight

	newTags := make([]Tag, 0, len(tags))

	for _, tag := range tags {
		keep := true
		for _, x := range excludes {
			if len(x.Name) > 0 {
				normalizedTagName := tag.Name
				normalizedNames := x.Name

				if x.IgnoreCase {
					normalizedTagName = strings.ToLower(tag.Name)
					normalizedNames = make([]string, len(x.Name))
					for i, n := range x.Name {
						normalizedNames[i] = strings.ToLower(n)
					}
				}

				if x.Namespace != "" {
					if x.Namespace == tag.Namespace && slices.Contains(normalizedNames, normalizedTagName) {
						keep = false
						break
					}
				} else if slices.Contains(normalizedNames, normalizedTagName) {
					keep = false
					break
				}
			} else if x.Namespace != "" && x.Namespace == tag.Namespace {
				keep = false
				break
			}
		}
		if keep {
			newTags = append(newTags, tag)
		}
	}

	slices.SortFunc(newTags, func(a Tag, b Tag) int {
		return getTagWeight(b, weights) - getTagWeight(a, weights)
	})

	return newTags
}
