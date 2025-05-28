package config

import (
	"errors"
	"faccina/util/sorting"
	"fmt"
	"slices"
)

type Admin struct {
	DeleteRequireConfirmation bool `toml:"delete_require_confirmation"`
}

type TagWeight struct {
	Name       StringOrArray `toml:"name,omitempty"`
	Namespace  string        `toml:"namespace,omitempty"`
	Weight     int           `toml:"weight"`
	IgnoreCase bool          `toml:"ignore_case,omitempty"`
}

type TagExclude struct {
	Name       StringOrArray `toml:"name,omitempty"`
	Namespace  string        `toml:"namespace,omitempty"`
	IgnoreCase bool          `toml:"ignore_case,omitempty"`
}

type GalleryListing struct {
	PageLimits           []int        `toml:"page_limits"`
	DefaultPageLimit     int          `toml:"default_page_limit,omitempty"`
	TagWeight            []TagWeight  `toml:"tag_weight,omitempty"`
	TagExclude           []TagExclude `toml:"tag_exclude,omitempty"`
	UseDefaultTagWeight  bool         `toml:"use_default_tag_weight"`
	UseDefaultTagExclude bool         `toml:"use_default_tag_exclude"`
}

type Site struct {
	SiteName            string         `toml:"site_name,omitempty"`
	Url                 string         `toml:"url,omitempty"`
	EnableUsers         bool           `toml:"enable_users"`
	EnableCollections   bool           `toml:"enable_collections"`
	EnableReadHistory   bool           `toml:"enable_read_history"`
	AdminUsers          []string       `toml:"admin_users,omitempty"`
	DefaultSort         sorting.Sort   `toml:"default_sort,omitempty"`
	DefaultOrder        sorting.Order  `toml:"default_order,omitempty"`
	GuestAccess         bool           `toml:"guest_access"`
	GuestDownloads      bool           `toml:"guest_downloads"`
	ClientSideDownloads bool           `toml:"client_side_downloads"`
	SearchPlaceholder   string         `toml:"search_placeholder,omitempty"`
	SecureSessionCookie bool           `toml:"secure_session_cookie"`
	Admin               Admin          `toml:"admin"`
	GalleryListing      GalleryListing `toml:"gallery_listing"`
}

func setSiteDefaults(config *Config) {
	config.Site.SiteName = "Faccina"
	config.Site.EnableUsers = true
	config.Site.EnableCollections = true
	config.Site.EnableReadHistory = true
	config.Site.AdminUsers = []string{}
	config.Site.DefaultSort = sorting.ReleasedAt
	config.Site.DefaultOrder = sorting.Descending
	config.Site.GuestAccess = true
	config.Site.GuestDownloads = true
	config.Site.ClientSideDownloads = true
	config.Site.SecureSessionCookie = false

	config.Site.Admin = Admin{
		DeleteRequireConfirmation: true,
	}

	config.Site.GalleryListing = GalleryListing{
		PageLimits:           []int{24},
		TagWeight:            []TagWeight{},
		TagExclude:           []TagExclude{},
		UseDefaultTagWeight:  true,
		UseDefaultTagExclude: true,
	}
}

func loadSiteConfig(config *Config) error {
	gl := &config.Site.GalleryListing

	if gl.UseDefaultTagWeight {
		gl.TagWeight = append([]TagWeight{
			{Namespace: "artist", Weight: 1000},
			{Namespace: "circle", Weight: 999},
			{Namespace: "parody", Weight: 998},
		}, gl.TagWeight...)
	}

	if gl.UseDefaultTagExclude {
		gl.TagExclude = append([]TagExclude{
			{Namespace: "parody", Name: []string{"original", "original work"}, IgnoreCase: true},
			{Namespace: "magazine"},
			{Namespace: "event"},
			{Namespace: "publisher"},
		}, gl.TagExclude...)
	}

	if len(gl.PageLimits) == 0 {
		return errors.New("gallery listing page limits property must contain a value")
	}

	if gl.DefaultPageLimit != 0 && !slices.Contains(gl.PageLimits, gl.DefaultPageLimit) {
		return fmt.Errorf("the given default page limit '%d' is not included in the gallery listing page limits property", gl.DefaultPageLimit)
	} else if gl.DefaultPageLimit == 0 {
		gl.DefaultPageLimit = gl.PageLimits[0]
	}

	if !slices.Contains(sorting.ValidConfigSorts, config.Site.DefaultSort) {
		return fmt.Errorf("the given default sort '%s' is not valid sort type", config.Site.DefaultSort)
	}

	if !slices.Contains(sorting.ValidOrders, config.Site.DefaultOrder) {
		return fmt.Errorf("the given default order '%s' is not valid order type", config.Site.DefaultOrder)
	}

	return nil
}
