package data

import (
	"crypto/md5"
	"database/sql"
	"encoding/binary"
	"encoding/json"
	. "faccina/.gen/table"
	"faccina/auth"
	"faccina/config"
	"faccina/data/query"
	"faccina/image"
	. "faccina/lib"
	"faccina/util/sorting"
	"fmt"
	"io"
	"math/rand"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/go-jet/jet/v2/qrm"
	. "github.com/go-jet/jet/v2/sqlite"
	"github.com/maruel/natural"
)

type Paginated[T any] struct {
	Data  []T `json:"data"`
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type Tag struct {
	Id        int32  `json:"-" sql:"primary_key"`
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type GalleryItem struct {
	Id        int32      `sql:"primary_key" json:"id"`
	Hash      string     `json:"hash"`
	Title     string     `json:"title"`
	Pages     int32      `json:"pages"`
	Tags      []Tag      `json:"tags"`
	Thumbnail int32      `json:"thumbnail"`
	DeletedAt *time.Time `json:"deletedAt"`
}

type CollectionItem struct {
	Id        int32   `sql:"primary_key" json:"id"`
	Name      string  `json:"name"`
	Slug      string  `json:"slug"`
	Protected bool    `json:"protected"`
	Archives  []int32 `json:"archives"`
}

type Image struct {
	Filename   string `json:"filename"`
	PageNumber int32  `json:"pageNumber" sql:"primary_key"`
	Width      *int32 `json:"width"`
	Height     *int32 `json:"height"`
}

type Source struct {
	Name string  `json:"name" sql:"primary_key"`
	Url  *string `json:"url" sql:"primary_key"`
}

type ArchiveSeries struct {
	Id    int32  `json:"id" sql:"primary_key"`
	Title string `json:"title"`
}

type Gallery struct {
	Id          int32                `sql:"primary_key" json:"id"`
	Hash        string               `json:"hash"`
	Title       string               `json:"title"`
	Description *string              `json:"description"`
	Pages       int32                `json:"pages"`
	Thumbnail   int32                `json:"thumbnail"`
	Language    *string              `json:"language"`
	Size        int32                `json:"size"`
	CreatedAt   time.Time            `json:"createdAt"`
	ReleasedAt  time.Time            `json:"releasedAt"`
	DeletedAt   *time.Time           `json:"deletedAt"`
	Tags        Slice[Tag]           `json:"tags"`
	Images      Slice[Image]         `json:"images"`
	Sources     Slice[Source]        `json:"sources"`
	Series      Slice[ArchiveSeries] `json:"series"`
	Favorite    bool                 `json:"favorite"`
}

type HistoryGalleryItem struct {
	Id        int32      `sql:"primary_key" json:"id"`
	Hash      string     `json:"hash"`
	Title     string     `json:"title"`
	Pages     int32      `json:"pages"`
	Thumbnail int32      `json:"thumbnail"`
	Tags      Slice[Tag] `json:"tags"`
}

type HistoryEntry struct {
	LastPage   int                `json:"lastPage"`
	StartPage  int                `json:"startPage"`
	StartedAt  time.Time          `json:"startedAt"`
	LastReadAt time.Time          `json:"lastReadAt"`
	FinishedAt *time.Time         `json:"finishedAt"`
	Gallery    HistoryGalleryItem `json:"gallery"`
}

type ApiTag struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type ApiGallery struct {
	Id          int32         `sql:"primary_key" json:"id"`
	Hash        string        `json:"hash"`
	Title       string        `json:"title"`
	Description *string       `json:"description"`
	Pages       int32         `json:"pages"`
	Thumbnail   int32         `json:"thumbnail"`
	Language    *string       `json:"language"`
	Size        int32         `json:"size"`
	CreatedAt   time.Time     `json:"createdAt"`
	ReleasedAt  time.Time     `json:"releasedAt"`
	Tags        Slice[ApiTag] `json:"tags"`
}

// Slice that serializes to an empty array if nil
type Slice[T any] []T

func (s Slice[T]) MarshalJSON() ([]byte, error) {
	if s == nil {
		return json.Marshal([]any{})
	}
	return json.Marshal([]T(s))
}

func EmptyPagination[T any](query query.Query) Paginated[T] {
	return Paginated[T]{
		Data:  make([]T, 0),
		Page:  query.Page,
		Limit: query.Limit,
		Total: 0,
	}
}

var (
	titleMatchRegex = regexp.MustCompile(`(?i)[-|~]?(\w+):(".*?"|[^\s]+)|\b(\w+)(>|<|=|>=|<=)(\d+)([kmg])?\b|\blanguage:(\w+)\b`) //nolint:gochecknoglobals
	tagMatchRegex   = regexp.MustCompile(`[-|~]?(\w+):(".*?"|[^\s]+)`)                                                            //nolint:gochecknoglobals
)

func applySort(sort sorting.Sort, order sorting.Order) OrderByClause {
	// TODO: Add random sort
	switch sort {
	case sorting.ReleasedAt:
		if order == sorting.Ascending {
			return Archives.ReleasedAt.ASC()
		} else {
			return Archives.ReleasedAt.DESC()
		}
	case sorting.CreatedAt:
		if order == sorting.Ascending {
			return (Archives.CreatedAt.ASC())
		} else {
			return Archives.CreatedAt.DESC()
		}
	case sorting.Pages:
		if order == sorting.Ascending {
			return Archives.Pages.ASC()
		} else {
			return Archives.Pages.DESC()
		}
	}

	return nil
}

func parseFtsSearch(search string) (string, string, string) {
	var and string
	var or string
	var not string

	// Replace matches with "#||#"
	replaced := titleMatchRegex.ReplaceAllString(search, "#||#")

	// Trim whitespace
	trimmed := strings.TrimSpace(replaced)

	// Split by "#||#"
	parts := strings.Split(trimmed, "#||#")

	// Trim each part and filter out empty strings
	var result []string
	for _, part := range parts {
		trimmedPart := strings.TrimSpace(part)
		if len(trimmedPart) > 0 {
			result = append(result, trimmedPart)
		}
	}

	if len(result) > 0 {
		splits := strings.Split(strings.Join(result, " "), " ")
		re := regexp.MustCompile(`[^ -~]`)

		var andQueries []string
		for _, split := range splits {
			if strings.HasPrefix(split, "~") || strings.HasPrefix(split, "-") {
				continue
			}

			s := strings.ToLower(strings.TrimSpace(re.ReplaceAllString(split, "")))

			if len(s) > 0 {
				andQueries = append(andQueries, s)
			}
		}

		var orQueries []string
		for _, split := range splits {
			if !strings.HasPrefix(split, "~") {
				continue
			}

			s := strings.ToLower(strings.TrimSpace(re.ReplaceAllString(split[1:], "")))

			if len(s) > 0 {
				orQueries = append(orQueries, s)
			}
		}

		var notQueries []string
		for _, split := range splits {
			if !strings.HasPrefix(split, "-") {
				continue
			}

			s := strings.ToLower(strings.TrimSpace(re.ReplaceAllString(split[1:], "")))

			if len(s) > 0 {
				notQueries = append(notQueries, s)
			}
		}

		var andMap []string
		for _, q := range andQueries {
			andMap = append(andMap, fmt.Sprintf("\"%s\"", q))
		}
		and = strings.Join(andMap, " AND ")

		if len(orQueries) > 0 {
			var orMap []string
			for _, q := range orQueries {
				orMap = append(orMap, fmt.Sprintf("\"%s\"", q))
			}
			or = fmt.Sprintf("(%s)", strings.Join(orMap, " OR "))
		}

		if len(notQueries) > 0 {
			var notMap []string
			for _, q := range notQueries {
				notMap = append(notMap, fmt.Sprintf("\"%s\"", q))
			}
			not = fmt.Sprintf("NOT (%s)", strings.Join(notMap, " AND "))
		}

		if len(andQueries) > 0 && len(orQueries) > 0 {
			or = fmt.Sprintf("AND %s", or)
		}
	}

	return and, or, not
}

func applyFts(stmt *SelectStatement, search string) []BoolExpression {
	and, or, not := parseFtsSearch(search)

	var conditions []BoolExpression

	if len(and) > 0 || len(or) > 0 || len(not) > 0 {
		*stmt = (*stmt).FROM(Archives.INNER_JOIN(ArchivesFts, RawBool("archives_fts.rowid = archives.id")))

		if len(and) == 0 && len(not) > 0 {
			if len(or) > 0 {
				conditions = append(conditions, RawBool("archives_fts = #or", RawArgs{"#or": or}))
			}

			conditions = append(conditions, Archives.ID.NOT_IN(
				SELECT(Archives.ID).
					FROM(Archives.INNER_JOIN(ArchivesFts, RawBool("archives_fts.rowid = archives.id"))).
					WHERE(RawBool("archives_fts = #not", RawArgs{"#not": strings.ReplaceAll(not, "NOT", "")})),
			))
		} else {
			conditions = append(conditions, RawBool("archives_fts = #cond", RawArgs{"#cond": fmt.Sprintf("%s %s %s", and, or, not)}))
		}
	}

	return conditions
}

type TagMatch struct {
	Namespace string
	Name      string
	Negate    bool
	Or        bool
}

func parseTagSearch(search string) []TagMatch {
	matches := tagMatchRegex.FindAllStringSubmatch(search, -1)

	var tagMatches []TagMatch

	for _, match := range matches {
		negate := false
		or := false

		if strings.HasPrefix(match[0], "-") {
			negate = true
		}

		if strings.HasPrefix(match[0], "~") {
			or = true
		}

		name := match[2]
		if strings.HasPrefix(name, "\"") && strings.HasSuffix(name, "\"") {
			name = name[1 : len(name)-1]
		}

		tagMatches = append(tagMatches, TagMatch{
			Namespace: match[1],
			Name:      name,
			Negate:    negate,
			Or:        or,
		})
	}

	return tagMatches
}

func applyTags(search string) []BoolExpression {
	tagMatches := parseTagSearch(search)

	if len(tagMatches) == 0 {
		return []BoolExpression{}
	}

	var andConditions []BoolExpression
	var orConditions []BoolExpression
	var notConditions []BoolExpression

	for _, tagMatch := range tagMatches {
		var expr BoolExpression

		if tagMatch.Namespace == "" {
			expr = Tags.Name.LIKE(String(tagMatch.Name))
		} else {
			expr = Tags.Namespace.EQ(String(tagMatch.Namespace)).AND(Tags.Name.LIKE(String(tagMatch.Name)))
		}

		existsExpr := EXISTS(
			SELECT(ArchiveTags.ArchiveID).FROM(ArchiveTags.
				INNER_JOIN(Tags, Tags.ID.EQ(ArchiveTags.TagID)),
			).WHERE(
				ArchiveTags.ArchiveID.EQ(Archives.ID).AND(expr),
			),
		)

		if tagMatch.Negate {
			notConditions = append(notConditions, NOT(existsExpr))
		} else if tagMatch.Or {
			orConditions = append(orConditions, existsExpr)
		} else {
			andConditions = append(andConditions, existsExpr)
		}
	}

	var conditions []BoolExpression
	conditions = append(conditions, andConditions...)
	conditions = append(conditions, notConditions...)

	if len(orConditions) > 0 {
		conditions = append(conditions, OR(orConditions...))
	}

	return conditions
}

func SearchArchives(q query.Query, db *sql.DB) ([]int32, error) {
	stmt := SELECT(
		Archives.ID.AS("archive.id"),
		Archives.Title.AS("archive.title"),
	).FROM(Archives)

	orderBy := applySort(q.Sort, q.Order)
	if orderBy != nil {
		stmt = stmt.ORDER_BY(orderBy)
	}

	var conditions []BoolExpression
	conditions = append(conditions, applyFts(&stmt, q.Search)...)
	conditions = append(conditions, applyTags(q.Search)...)

	if !q.Hidden {
		conditions = append(conditions, Archives.DeletedAt.IS_NULL())
	}

	if len(conditions) > 0 {
		stmt = stmt.WHERE(AND(conditions...))
	}

	type archive struct {
		Id    int32 `sql:"primary_key"`
		Title string
	}

	var archives []archive

	err := stmt.Query(db, &archives)
	if err != nil {
		return nil, err
	}

	if q.Sort == sorting.Title {
		sort.Slice(archives, func(i int, j int) bool {
			return natural.Less(strings.ToLower(archives[i].Title), strings.ToLower(archives[j].Title))
		})

		if q.Order == sorting.Descending {
			slices.Reverse(archives)
		}
	} else if q.Sort == sorting.Random {
		h := md5.New()
		io.WriteString(h, q.Seed)
		seed := binary.BigEndian.Uint64(h.Sum(nil))
		source := rand.NewSource(int64(seed))
		r := rand.New(source)
		r.Shuffle(len(archives), func(i, j int) {
			archives[i], archives[j] = archives[j], archives[i]
		})

		if q.Order == sorting.Descending {
			slices.Reverse(archives)
		}
	}

	ids := make([]int32, len(archives))
	for i, archive := range archives {
		ids[i] = archive.Id
	}

	return ids, nil
}

type ApiGalleryItem struct {
	ID          int32      `sql:"primary_key" json:"id"`
	Hash        string     `json:"hash"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Pages       int32      `json:"pages"`
	Thumbnail   int32      `json:"thumbnail"`
	Language    *string    `json:"language"`
	Size        int32      `json:"size"`
	CreatedAt   time.Time  `json:"createdAt"`
	ReleasedAt  *time.Time `json:"releasedAt"`
	Tags        []Tag      `json:"tags" alias:"tags"`
}

func GetApiLibraryArchives(query query.Query, db *sql.DB) (Paginated[ApiGalleryItem], error) {
	ids, err := SearchArchives(query, db)
	if err != nil {
		return EmptyPagination[ApiGalleryItem](query), err
	}

	total := len(ids)

	if total < 1 {
		return EmptyPagination[ApiGalleryItem](query), nil
	}

	start := max((query.Page-1)*query.Limit, 0)
	if start >= total {
		return EmptyPagination[ApiGalleryItem](query), nil
	}

	end := min(start+query.Limit, total)

	ids = ids[start:end]

	var sqlIDs []Expression

	for _, id := range ids {
		sqlIDs = append(sqlIDs, Int32(id))
	}

	stmt := SELECT(
		Archives.ID.AS("api_gallery_item.id"),
		Archives.Hash.AS("api_gallery_item.hash"),
		Archives.Title.AS("api_gallery_item.title"),
		Archives.Description.AS("api_gallery_item.description"),
		Archives.Pages.AS("api_gallery_item.pages"),
		Archives.Thumbnail.AS("api_gallery_item.thumbnail"),
		Archives.Language.AS("api_gallery_item.language"),
		Archives.Size.AS("api_gallery_item.size"),
		Archives.CreatedAt.AS("api_gallery_item.created_at"),
		Archives.ReleasedAt.AS("api_gallery_item.released_at"),
		Tags.Namespace,
		Tags.Name,
	).FROM(
		Archives.
			LEFT_JOIN(ArchiveTags, Archives.ID.EQ(ArchiveTags.ArchiveID)).
			LEFT_JOIN(Tags, Tags.ID.EQ(ArchiveTags.TagID)),
	).WHERE(
		Archives.ID.IN(sqlIDs...),
	).ORDER_BY(
		Archives.ReleasedAt.DESC(),
		ArchiveTags.CreatedAt.ASC(),
	)

	var archives []ApiGalleryItem
	err = stmt.Query(db, &archives)
	if err != nil {
		return EmptyPagination[ApiGalleryItem](query), err
	}

	slices.SortFunc(archives, func(a ApiGalleryItem, b ApiGalleryItem) int {
		return slices.Index(ids, a.ID) - slices.Index(ids, b.ID)
	})

	response := Paginated[ApiGalleryItem]{
		Data:  archives,
		Page:  query.Page,
		Limit: query.Limit,
		Total: total,
	}

	return response, nil
}

func GetLibraryArchives(query query.Query, db *sql.DB, config *config.Config) (Paginated[GalleryItem], error) {
	ids, err := SearchArchives(query, db)
	if err != nil {
		return EmptyPagination[GalleryItem](query), err
	}

	total := len(ids)

	if total < 1 {
		return EmptyPagination[GalleryItem](query), nil
	}

	start := max((query.Page-1)*query.Limit, 0)
	if start >= total {
		return EmptyPagination[GalleryItem](query), nil
	}

	end := min(start+query.Limit, total)

	ids = ids[start:end]

	var sqlIDs []Expression

	for _, id := range ids {
		sqlIDs = append(sqlIDs, Int32(id))
	}

	stmt := SELECT(
		Archives.ID.AS("gallery_item.id"),
		Archives.Hash.AS("gallery_item.hash"),
		Archives.Title.AS("gallery_item.title"),
		Archives.Pages.AS("gallery_item.pages"),
		Archives.Thumbnail.AS("gallery_item.thumbnail"),
		Archives.DeletedAt.AS("gallery_item.deleted_at"),
		Tags.Namespace.AS("tag.namespace"),
		Tags.Name.AS("tag.name"),
	).FROM(
		Archives.
			LEFT_JOIN(ArchiveTags, Archives.ID.EQ(ArchiveTags.ArchiveID)).
			LEFT_JOIN(Tags, Tags.ID.EQ(ArchiveTags.TagID)),
	).WHERE(
		Archives.ID.IN(sqlIDs...),
	).ORDER_BY(
		Archives.ReleasedAt.DESC(),
		ArchiveTags.CreatedAt.ASC(),
	)

	var archives []GalleryItem
	err = stmt.Query(db, &archives)
	if err != nil {
		return Paginated[GalleryItem]{Page: 1}, err
	}

	slices.SortFunc(archives, func(a GalleryItem, b GalleryItem) int {
		return slices.Index(ids, a.Id) - slices.Index(ids, b.Id)
	})

	for i, archive := range archives {
		archives[i].Tags = handleTags(archive.Tags, config)
	}

	response := Paginated[GalleryItem]{
		Data:  archives,
		Page:  query.Page,
		Limit: query.Limit,
		Total: total,
	}

	return response, nil
}

func GetUserCollections(user auth.User, db *sql.DB) ([]CollectionItem, error) {
	stmt := SELECT(
		Collection.ID.AS("collection_item.id"),
		Collection.Name.AS("collection_item.name"),
		Collection.Slug.AS("collection_item.slug"),
		Collection.Protected.AS("collection_item.protected"),
		CollectionArchive.ArchiveID.AS("archives"),
	).
		FROM(Collection.LEFT_JOIN(CollectionArchive, CollectionArchive.CollectionID.EQ(Collection.ID))).
		WHERE(Collection.UserID.EQ(String(user.Id))).
		GROUP_BY(Collection.ID).
		ORDER_BY(Collection.CreatedAt.ASC())

	collections := make([]CollectionItem, 0, 0)
	err := stmt.Query(db, &collections)
	if err != nil {
		return nil, err
	}

	return collections, nil
}

func GetTagList(db *sql.DB) ([]Tag, error) {
	stmt := SELECT(Tags.Namespace.AS("tag.namespace"), Tags.Name.AS("tag.name")).FROM(Tags)

	var tags []Tag
	err := stmt.Query(db, &tags)
	return tags, err
}

func GetApiGallery(id int32, user *auth.User, db *sql.DB) (ApiGallery, error) {
	var isAdmin bool
	if user != nil {
		isAdmin = user.Admin
	}

	stmt := SELECT(
		Archives.AllColumns.Except(Archives.Path, Archives.Protected, Archives.UpdatedAt, Archives.DeletedAt).As("api_gallery"),
		Tags.Namespace.AS("api_tag.namespace"),
		Tags.Name.AS("api_tag.name"),
	).
		DISTINCT().
		FROM(Archives.
			LEFT_JOIN(ArchiveTags, Archives.ID.EQ(ArchiveTags.ArchiveID)).
			LEFT_JOIN(Tags, Tags.ID.EQ(ArchiveTags.TagID)),
		).
		ORDER_BY(ArchiveTags.CreatedAt.ASC())

	conditions := []BoolExpression{Archives.ID.EQ(Int32(id))}
	if !isAdmin {
		conditions = append(conditions, Archives.DeletedAt.IS_NULL())
	}

	stmt = stmt.WHERE(AND(conditions...))

	var gallery ApiGallery
	err := stmt.Query(db, &gallery)
	if err != nil {
		if err == qrm.ErrNoRows {
			return ApiGallery{}, ErrorGalleryNotFound
		}
		return ApiGallery{}, err
	}

	return gallery, nil
}

func GetGallery(id int32, user auth.User, db *sql.DB) (Gallery, error) {
	stmt := SELECT(Archives.AllColumns.Except(Archives.Path, Archives.Protected, Archives.UpdatedAt).As("gallery"),
		Tags.ID.AS("tag.id"),
		Tags.Namespace.AS("tag.namespace"),
		Tags.Name.AS("tag.name"),
		ArchiveImages.Filename.AS("image.filename"),
		ArchiveImages.PageNumber.AS("image.pageNumber"),
		ArchiveImages.Width.AS("image.width"),
		ArchiveImages.Height.AS("image.height"),
		ArchiveSources.Name.AS("source.name"),
		ArchiveSources.URL.AS("source.url"),
		Series.ID.AS("archive_series.id"),
		Series.Title.AS("archive_series.title"),
		CASE().WHEN(UserFavorites.ArchiveID.IS_NOT_NULL()).THEN(Bool(true)).ELSE(Bool(false)).AS("gallery.favorite"),
	).FROM(Archives.
		LEFT_JOIN(ArchiveTags, Archives.ID.EQ(ArchiveTags.ArchiveID)).
		LEFT_JOIN(Tags, Tags.ID.EQ(ArchiveTags.TagID)).
		LEFT_JOIN(ArchiveImages, Archives.ID.EQ(ArchiveImages.ArchiveID)).
		LEFT_JOIN(ArchiveSources, Archives.ID.EQ(ArchiveSources.ArchiveID)).
		LEFT_JOIN(SeriesArchive, Archives.ID.EQ(SeriesArchive.ArchiveID)).
		LEFT_JOIN(Series, Series.ID.EQ(SeriesArchive.SeriesID)).
		LEFT_JOIN(UserFavorites, Archives.ID.EQ(UserFavorites.ArchiveID).AND(UserFavorites.UserID.EQ(String(user.Id)))),
	).ORDER_BY(ArchiveTags.CreatedAt.ASC())

	conditions := []BoolExpression{Archives.ID.EQ(Int32(id))}
	if user.Admin {
		conditions = append(conditions, Archives.DeletedAt.IS_NULL())
	}

	stmt = stmt.WHERE(AND(conditions...))

	var gallery Gallery
	err := stmt.Query(db, &gallery)
	if err != nil {
		if err == qrm.ErrNoRows {
			return gallery, ErrorGalleryNotFound
		}
		return gallery, err
	}

	return gallery, nil
}

func DeleteGallery(id int32, deleteSource bool, imagesDir string, db *sql.DB) error {
	stmt := SELECT(
		Archives.ID.AS("id"),
		Archives.Title.AS("title"),
		Archives.Path.AS("path"),
		Archives.Hash.AS("hash"),
	).FROM(Archives).WHERE(Archives.ID.EQ(Int32(id)))

	var archive struct {
		ID    int32
		Title string
		Path  string
		Hash  string
	}
	err := stmt.Query(db, &archive)
	if err != nil {
		if err == qrm.ErrNoRows {
			return ErrorGalleryNotFound
		}
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Remove from database
	deleteStmt := Archives.DELETE().WHERE(Archives.ID.EQ(Int32(id)))
	if _, err = deleteStmt.Exec(tx); err != nil {
		return err
	}

	// Remove all images
	imageDir := filepath.Join(image.Directory(archive.Hash, imagesDir))
	if err = os.RemoveAll(imageDir); err != nil {
		return err
	}

	if deleteSource {
		// Remove content files
		if err = os.RemoveAll(archive.Path); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func GetReadHistory(user auth.User, db *sql.DB, config *config.Config) ([]HistoryEntry, error) {
	stmt := SELECT(
		UserReadHistory.AllColumns.Except(
			UserReadHistory.UserID,
			UserReadHistory.ArchiveID,
			UserReadHistory.MaxPage,
		).As("history_entry"),
		Archives.ID.AS("history_gallery_item.id"),
		Archives.Title.AS("history_gallery_item.title"),
		Archives.Hash.AS("history_gallery_item.hash"),
		Archives.Pages.AS("history_gallery_item.pages"),
		Archives.Thumbnail.AS("history_gallery_item.thumbnail"),
		Tags.ID.AS("tag.id"),
		Tags.Namespace.AS("tag.namespace"),
		Tags.Name.AS("tag.name"),
	).FROM(UserReadHistory.
		INNER_JOIN(Archives, Archives.ID.EQ(UserReadHistory.ArchiveID)).
		LEFT_JOIN(ArchiveTags, Archives.ID.EQ(ArchiveTags.ArchiveID)).
		LEFT_JOIN(Tags, Tags.ID.EQ(ArchiveTags.TagID)),
	).ORDER_BY(UserReadHistory.LastReadAt.DESC())

	conditions := []BoolExpression{UserReadHistory.UserID.EQ(String(user.Id))}
	if !user.Admin {
		conditions = append(conditions, Archives.DeletedAt.IS_NULL())
	}

	stmt = stmt.WHERE(AND(conditions...))

	var entries []HistoryEntry
	if err := stmt.Query(db, &entries); err != nil {
		return []HistoryEntry{}, err
	}

	for i, entry := range entries {
		entries[i].Gallery.Tags = handleTags(entry.Gallery.Tags, config)
	}

	return entries, nil
}
