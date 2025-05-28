package server

import (
	"encoding/json"
	. "faccina/.gen/table"
	"faccina/data"
	. "faccina/lib"
	"net/http"

	"github.com/go-jet/jet/v2/qrm"
	. "github.com/go-jet/jet/v2/sqlite"
)

func readHistoryHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	user, ok := getRequestUser(r)
	if !ok {
		return ErrorStatusUnauthorized
	}

	data, err := data.GetReadHistory(user, state.DB, state.Config)
	if err != nil {
		return err
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
	return nil
}

func toggleFavoriteHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	user, ok := getRequestUser(r)
	if !ok {
		return ErrorStatusUnauthorized
	}

	id, err := getParamID(r)
	if err != nil {
		return err
	}

	stmt := SELECT(CASE().WHEN(UserFavorites.ArchiveID.IS_NOT_NULL()).THEN(Bool(true)).ELSE(Bool(false)).AS("favorite")).
		FROM(Archives.LEFT_JOIN(UserFavorites, Archives.ID.EQ(UserFavorites.ArchiveID).AND(UserFavorites.UserID.EQ(String(user.Id))))).
		WHERE(Archives.ID.EQ(Int32(int32(id))))

	var result struct{ Favorite bool }
	if err := stmt.Query(state.DB, &result); err != nil {
		if err == qrm.ErrNoRows {
			return ErrorGalleryNotFound
		}
		return err
	}

	if result.Favorite {
		stmt := UserFavorites.DELETE().WHERE(UserFavorites.ArchiveID.EQ(Int32(int32(id))).AND(UserFavorites.UserID.EQ(String(user.Id))))
		if _, err := stmt.Exec(state.DB); err != nil {
			return err
		}
	} else {
		stmt := UserFavorites.INSERT(UserFavorites.ArchiveID, UserFavorites.UserID).VALUES(Int32(int32(id)), String(user.Id))
		if _, err := stmt.Exec(state.DB); err != nil {
			return err
		}
	}

	return nil
}

func UserRouter(state *State) *http.ServeMux {
	mux := http.NewServeMux()
	mux.Handle("GET /read-history", Handler{state, readHistoryHandler})
	mux.Handle("POST /toggle-favorite/{id}", Handler{state, toggleFavoriteHandler})
	return mux
}
