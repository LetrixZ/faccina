package server

import (
	"encoding/json"
	"faccina/auth"
	"faccina/data"
	"faccina/data/query"
	. "faccina/lib"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
)

type PresetConfig struct {
	Name  string `json:"name"`
	Label string `json:"label"`
	Hash  string `json:"hash"`
}

type ReaderConfig struct {
	Presets       []PresetConfig `json:"presets"`
	DefaultPreset *PresetConfig  `json:"defaultPreset,omitempty"`
	AllowOriginal bool           `json:"allowOriginal"`
}

type ServerConfig struct {
	ImageServer *string      `json:"imageServer"`
	Reader      ReaderConfig `json:"reader"`
}

func apiRoot(state *State, w http.ResponseWriter, r *http.Request) error {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"message": state.Config.Site.SiteName, "version": "3.0.0"})
	return nil
}

func apiLibrary(state *State, w http.ResponseWriter, r *http.Request) error {
	q := query.FromUrl(r.URL.Query(), state.Config)
	if userSession, ok := r.Context().Value("userSession").(*auth.UserSession); ok &&
		userSession.User.Admin {
		q.Hidden = true
	}

	library, err := data.GetApiLibraryArchives(q, state.DB)
	if err != nil {
		return err
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(library)
	return nil
}

func apiGallery(state *State, w http.ResponseWriter, r *http.Request) error {
	var user *auth.User
	if userSession, ok := r.Context().Value("userSession").(*auth.UserSession); ok {
		user = &userSession.User
	}

	if !state.Config.Site.GuestAccess && user == nil {
		slog.Warn("guest access is disabled, user not authenticated")
		return StatusError{404, ErrorGalleryNotFound}
	}

	idValue := r.PathValue("id")

	id, err := strconv.Atoi(idValue)
	if err != nil {
		return StatusError{400, fmt.Errorf("Given ID '%s' is invalid", idValue)}
	}

	gallery, err := data.GetApiGallery(int32(id), user, state.DB)
	if err != nil {
		return err
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(gallery)
	return nil
}

func apiConfig(state *State, w http.ResponseWriter, r *http.Request) error {
	presets := state.Config.Image.Preset

	readerPresets := make([]PresetConfig, 0, len(presets))

	for name, preset := range presets {
		readerPresets = append(readerPresets, PresetConfig{
			Name:  name,
			Hash:  preset.Hash,
			Label: preset.Label,
		})
	}

	var defaultPreset *PresetConfig

	if state.Config.Image.ReaderDefaultPreset != "" {
		for name, preset := range presets {
			if state.Config.Image.ReaderDefaultPreset == name {
				defaultPreset = &PresetConfig{
					Name:  name,
					Hash:  preset.Hash,
					Label: preset.Label,
				}
			}
		}

	}

	config := ServerConfig{
		ImageServer: nil,
		Reader: ReaderConfig{
			Presets:       readerPresets,
			DefaultPreset: defaultPreset,
			AllowOriginal: state.Config.Image.ReaderAllowOriginal,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
	return nil
}

func registerAPIRoutes(mux *http.ServeMux, state *State) {
	mux.Handle("GET /api", Handler{state, apiRoot})
	mux.Handle("GET /api/config", Handler{state, apiConfig})
	mux.Handle("GET /api/library", Handler{state, apiLibrary})
	mux.Handle("GET /api/g/{id}", Handler{state, apiGallery})
}
