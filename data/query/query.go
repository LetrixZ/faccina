package query

import (
	"faccina/config"
	"faccina/util/sorting"
	"net/url"
	"slices"
	"strconv"
	"strings"
)

type Query struct {
	Search string
	Sort   sorting.Sort
	Order  sorting.Order
	Seed   string

	Page  int
	Limit int

	Hidden bool
}

func FromUrl(values url.Values, config *config.Config) Query {
	site := config.Site
	gl := site.GalleryListing

	q := Query{
		Sort:  sorting.Sort(site.DefaultSort),
		Order: sorting.Order(site.DefaultOrder),
		Seed:  values.Get("seed"),

		Page:  1,
		Limit: gl.DefaultPageLimit,
	}

	if search := values.Get("q"); search != "" {
		search, _ = url.QueryUnescape(search)
		q.Search = strings.ReplaceAll(search, "$", "")
	}

	if s := values.Get("sort"); slices.Contains(sorting.ValidSorts, sorting.Sort(strings.ToLower(s))) {
		q.Sort = sorting.Sort(s)
	}

	if o := values.Get("order"); slices.Contains(sorting.ValidOrders, sorting.Order(strings.ToLower(o))) {
		q.Order = sorting.Order(o)
	}

	if page, err := strconv.Atoi(values.Get("page")); err == nil {
		if page < 1 {
			page = 1
		}

		q.Page = page
	}

	if limit, err := strconv.Atoi(values.Get("limit")); err == nil {
		if slices.Contains(gl.PageLimits, limit) {
			q.Limit = limit
		}
	}

	return q
}
