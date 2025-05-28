package server

import (
	"encoding/json"
	"faccina/data"
	. "faccina/lib"
	"log/slog"
	"net/http"
)

func galleryHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	user, ok := getRequestUser(r)
	if !state.Config.Site.GuestAccess && !ok {
		slog.Warn("guest access is disabled, user not authenticated")
		return ErrorGalleryNotFound
	}

	id, err := getParamID(r)
	if err != nil {
		return err
	}

	gallery, err := data.GetGallery(id, user, state.DB)
	if err != nil {
		return err
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(gallery)
	return nil
}

func deleteGalleryHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	user, _ := getRequestUser(r)
	if !user.Admin {
		return ErrorStatusForbidden
	}

	id, err := getParamID(r)
	if err != nil {
		return err
	}

	return data.DeleteGallery(int32(id), true, state.Config.Directories.Images, state.DB)
}

func GalleryRouter(state *State) *http.ServeMux {
	mux := http.NewServeMux()
	mux.Handle("GET /{id}", Handler{state, galleryHandler})
	mux.Handle("DELETE /{id}", Handler{state, deleteGalleryHandler})
	return mux
}
