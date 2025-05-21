package sorting

type Sort string

const (
	ReleasedAt Sort = "released_at"
	CreatedAt  Sort = "created_at"
	Title      Sort = "title"
	Pages      Sort = "pages"
	Random     Sort = "random"
)

var ValidSorts = []Sort{"released_at", "created_at", "title", "pages", "random", "favorited_on", "added_on", "bookmarked_on"}
var ValidConfigSorts = []Sort{"released_at", "created_at", "title", "pages", "random"}

type Order string

const (
	Ascending  Order = "asc"
	Descending Order = "desc"
)

var ValidOrders = []Order{"asc", "desc"}
