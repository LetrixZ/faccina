package server

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"faccina/auth"
	"faccina/config"
	. "faccina/lib"
	"faccina/web"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/fatih/color"
	"github.com/urfave/negroni"
)

type Handler struct {
	*State
	H func(s *State, w http.ResponseWriter, r *http.Request) error
}

func writeError(err error, status int, w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{
		"message": err.Error(),
		"status":  status,
	})
}

func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := h.H(h.State, w, r)
	if err != nil {
		switch e := err.(type) {
		case Error:
			slog.Error(err.Error())
			writeError(e, e.Status(), w)
		default:
			slog.Error(fmt.Sprintf("unexpected error: %v", err))
			writeError(errors.New(http.StatusText(http.StatusInternalServerError)), http.StatusInternalServerError, w)
		}
	}
}

func logging(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rw := negroni.NewResponseWriter(w)

		start := time.Now()
		handler.ServeHTTP(rw, r)

		statusColor := color.Reset

		if rw.Status() >= 200 && rw.Status() <= 299 {
			statusColor = color.FgGreen
		} else if rw.Status() >= 300 && rw.Status() <= 399 {
			statusColor = color.FgYellow
		} else if rw.Status() >= 400 {
			statusColor = color.FgRed
		}

		slog.Info(fmt.Sprintf("%s (%s) - %s - %s",
			color.New(color.Bold).Sprint(r.Method),
			color.New(statusColor).Sprint(rw.Status()),
			color.New(color.Bold, color.FgBlue).Sprint(r.URL.String()),
			color.New(color.Bold).Sprint(time.Since(start))))
	})
}

func cors(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Access-Control-Allow-Origin", "*")
		w.Header().Add("Access-Control-Allow-Credentials", "true")
		handler.ServeHTTP(w, r)
	})
}

func user(handler http.Handler, state *State) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sessionCokie, err := r.Cookie("session")
		if err != nil {
			r = r.WithContext(context.WithValue(r.Context(), "userSession", nil))
		} else {
			userSession, err := auth.ValidateSessionToken(sessionCokie.Value, state.DB, state.Config.Site.AdminUsers)
			if err != nil {
				if err.Error() == "session expired" {
					auth.DeleteSessionTokenCookie(w)
				} else {
					writeError(err, http.StatusInternalServerError, w)
					return
				}
			} else if userSession != nil {
				r = r.WithContext(context.WithValue(r.Context(), "userSession", userSession))
			}
		}

		handler.ServeHTTP(w, r)
	})
}

func Start(host string, port string, config *config.Config, db *sql.DB) error {
	state := &State{
		Config: config,
		DB:     db,
	}

	addr := fmt.Sprintf("%s:%s", host, port)
	mux := http.NewServeMux()

	mux.Handle("/api/v1/auth/", http.StripPrefix("/api/v1/auth", AuthRouter(state)))
	mux.Handle("/api/v1/gallery/", http.StripPrefix("/api/v1/gallery", GalleryRouter(state)))
	mux.Handle("/api/v1/user/", http.StripPrefix("/api/v1/user", UserRouter(state)))

	registerAPIRoutes(mux, state)
	registerGeneralRoutes(mux, state)
	registerInternalAppRoutes(mux, state)

	mux.Handle("/", web.SvelteKitHandler())
	handler := user(cors(logging(mux)), state)

	slog.Info(fmt.Sprintf("listening on %s", addr))

	err := http.ListenAndServe(addr, handler)
	if err != nil && err != http.ErrServerClosed {
		return err
	}

	return nil
}
