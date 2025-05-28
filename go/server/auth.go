package server

import (
	"errors"
	. "faccina/.gen/table"
	"faccina/auth"
	. "faccina/lib"
	"net/http"

	"github.com/alexedwards/argon2id"
	"github.com/go-jet/jet/v2/qrm"
	. "github.com/go-jet/jet/v2/sqlite"
)

func loginHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	if err := r.ParseForm(); err != nil {
		return err
	}

	username := r.Form.Get("username")
	password := r.Form.Get("password")

	if username == "" || password == "" {
		return StatusError{http.StatusBadRequest, errors.New("Username or password missing")}
	}

	stmt := SELECT(
		Users.ID.AS("id"),
		Users.Username.AS("username"),
		Users.PasswordHash.AS("password_hash"),
	).FROM(Users).WHERE(Users.Username.EQ(String(username)))

	var user struct {
		ID           string `sql:"primary_key"`
		Username     string
		PasswordHash string
	}
	if err := stmt.Query(state.DB, &user); err != nil {
		if err == qrm.ErrNoRows {
			return StatusError{http.StatusBadRequest, errors.New("Invalid credentials")}
		}
		return err
	}

	match, err := argon2id.ComparePasswordAndHash(password, user.PasswordHash)
	if err != nil {
		return err
	}

	if !match {
		return StatusError{http.StatusBadRequest, errors.New("Invalid credentials")}
	}

	token := auth.GenerateSessionToken()
	expiresAt, err := auth.CreateSession(token, user.ID, state.DB)
	if err != nil {
		return err
	}

	auth.SetSessionTokenCookie(token, expiresAt, w, r)
	return nil
}

func logoutHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	auth.DeleteSessionTokenCookie(w)
	w.WriteHeader(200)
	return nil
}

func AuthRouter(state *State) *http.ServeMux {
	mux := http.NewServeMux()
	mux.Handle("POST /login", Handler{state, loginHandler})
	mux.Handle("POST /logout", Handler{state, logoutHandler})
	return mux
}
