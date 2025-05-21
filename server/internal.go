package server

import (
	"database/sql"
	"encoding/json"
	"faccina/auth"
	"faccina/config"
	"faccina/data"
	"faccina/data/query"
	. "faccina/lib"
	"faccina/util/sorting"
	"log/slog"
	"net/http"
)

type AdminConfig struct {
	DeleteRequireConfirmation bool `json:"deleteRequireConfirmation"`
}

type SiteConfig struct {
	Name                string        `json:"name"`
	EnableUsers         bool          `json:"enableUsers"`
	EnableCollections   bool          `json:"enableCollections"`
	EnableReadHistory   bool          `json:"enableReadHistory"`
	HasMailer           bool          `json:"hasMailer"`
	DefaultSort         sorting.Sort  `json:"defaultSort"`
	DefaultOrder        sorting.Order `json:"defaultOrder"`
	GuestDownloads      bool          `json:"guestDownloads"`
	GuestAccess         bool          `json:"guestAccess"`
	SearchPlaceholder   string        `json:"searchPlaceholder"`
	PageLimits          []int         `json:"pageLimits"`
	DefaultPageLimit    int           `json:"defaultPageLimit"`
	ClientSideDownloads bool          `json:"clientSideDownloads"`
	Admin               AdminConfig   `json:"admin"`
}

type InternalLayout struct {
	User *auth.User `json:"user"`
	Site SiteConfig `json:"site"`
}

func internalLayout(user *auth.User, config *config.Config) InternalLayout {
	return InternalLayout{
		User: user,
		Site: SiteConfig{
			Name:                config.Site.SiteName,
			EnableUsers:         config.Site.EnableUsers,
			EnableCollections:   config.Site.EnableCollections,
			EnableReadHistory:   config.Site.EnableReadHistory,
			HasMailer:           config.Mailer != nil,
			DefaultSort:         config.Site.DefaultSort,
			DefaultOrder:        config.Site.DefaultOrder,
			GuestDownloads:      config.Site.GuestDownloads,
			GuestAccess:         config.Site.GuestAccess,
			SearchPlaceholder:   config.Site.SearchPlaceholder,
			PageLimits:          config.Site.GalleryListing.PageLimits,
			DefaultPageLimit:    config.Site.GalleryListing.DefaultPageLimit,
			ClientSideDownloads: config.Site.ClientSideDownloads,
			Admin:               AdminConfig{config.Site.Admin.DeleteRequireConfirmation},
		},
	}
}

func layoutHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	var user *auth.User
	if u, ok := getRequestUser(r); ok {
		user = &u
	}

	data := internalLayout(user, state.Config)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
	return nil
}

type HomePage struct {
	Library data.Paginated[data.GalleryItem] `json:"library"`
}

func emptyHomePage(q query.Query) HomePage {
	return HomePage{data.EmptyPagination[data.GalleryItem](q)}
}

func homePage(query query.Query, db *sql.DB, config *config.Config) (HomePage, error) {
	library, err := data.GetLibraryArchives(query, db, config)
	if err != nil {
		return emptyHomePage(query), err
	}

	return HomePage{library}, nil
}

func homePageHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	user, ok := getRequestUser(r)
	if !state.Config.Site.GuestAccess && !ok {
		slog.Warn("guest access is disabled, user not authenticated")
		return StatusError{404, ErrorGalleryNotFound}
	}

	q := query.FromUrl(r.URL.Query(), state.Config)
	if user.Admin {
		q.Hidden = true
	}

	data, err := homePage(q, state.DB, state.Config)
	if err != nil {
		return err
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
	return nil
}

type AppLayout struct {
	TagList         []data.Tag            `json:"tagList"`
	UserCollections []data.CollectionItem `json:"userCollections"`
}

func appLayout(user auth.User, db *sql.DB) (AppLayout, error) {
	tagList, err := data.GetTagList(db)
	if err != nil {
		return AppLayout{}, err
	}

	var userCollections []data.CollectionItem
	if user.IsAuth() {
		c, err := data.GetUserCollections(user, db)
		if err != nil {
			return AppLayout{}, err
		}

		userCollections = c
	}

	return AppLayout{tagList, userCollections}, nil
}

func appLayoutHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	user, _ := getRequestUser(r)

	data, err := appLayout(user, state.DB)
	if err != nil {
		return err
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
	return nil
}

func registerInternalAppRoutes(mux *http.ServeMux, state *State) {
	mux.Handle("GET /internal/layout", Handler{state, layoutHandler})
	mux.Handle("GET /internal/app/layout", Handler{state, appLayoutHandler})

	mux.Handle("GET /internal/app/main", Handler{state, homePageHandler})

	mux.Handle("GET /internal/app/read-history", Handler{state, readHistoryHandler})

	mux.Handle("POST /internal/app/login", Handler{state, loginHandler})
}
