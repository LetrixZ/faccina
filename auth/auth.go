package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	. "faccina/gen/table"
	"io"
	"net/http"
	"slices"
	"time"

	"github.com/go-jet/jet/v2/qrm"
	. "github.com/go-jet/jet/v2/sqlite"
)

type Session struct {
	Id        string
	UserId    string
	ExpiresAt time.Time
}

type User struct {
	Id       string `json:"id"`
	Username string `json:"username"`
	Admin    bool   `json:"admin"`
}

func (user *User) IsAuth() bool {
	return user.Id != ""
}

type UserSession struct {
	User    User
	Session Session
}

func GenerateSessionToken() string {
	return rand.Text()
}

func CreateSession(token string, userId string, db *sql.DB) (time.Time, error) {
	h := sha256.New()
	io.WriteString(h, token)
	sessionId := hex.EncodeToString(h.Sum(nil))
	expiresAt := time.Now().Add(time.Duration(30*24) * time.Hour)

	stmt := UserSessions.INSERT(
		UserSessions.ID,
		UserSessions.UserID,
		UserSessions.ExpiresAt,
	).VALUES(
		sessionId,
		userId,
		expiresAt,
	)

	_, err := stmt.Exec(db)
	if err != nil {
		return expiresAt, err
	}

	return expiresAt, nil
}

func ValidateSessionToken(token string, db *sql.DB, admins []string) (*UserSession, error) {
	h := sha256.New()
	io.WriteString(h, token)
	sessionId := hex.EncodeToString(h.Sum(nil))

	stmt := UserSessions.INNER_JOIN(
		Users, Users.ID.EQ(UserSessions.UserID),
	).SELECT(
		UserSessions.ID.AS("session.id"),
		UserSessions.UserID.AS("session.user_id"),
		UserSessions.ExpiresAt.AS("session.expires_at"),
		Users.ID.AS("user.id"),
		Users.Username.AS("user.username"),
	).WHERE(UserSessions.ID.EQ(String(sessionId)))

	var userSession UserSession

	if err := stmt.Query(db, &userSession); err != nil {
		if err == qrm.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	session := userSession.Session

	if time.Now().After(session.ExpiresAt) {
		_, err := UserSessions.DELETE().WHERE(UserSessions.ID.EQ(String(session.Id))).Exec(db)
		if err != nil {
			return nil, err
		}

		return nil, errors.New("session expired")
	}

	if time.Now().After(session.ExpiresAt.Add(-(15 * 24 * time.Hour))) {
		_, err := UserSessions.UPDATE(UserSessions.ExpiresAt).SET(time.Now().Add(time.Duration(30*24) * time.Hour)).Exec(db)
		if err != nil {
			return nil, err
		}
	}

	userSession.User.Admin = slices.Contains(admins, userSession.User.Username)

	return &userSession, nil
}

func InvalidateSession(sessionId string, db *sql.DB) error {
	_, err := UserSessions.DELETE().WHERE(UserSessions.ID.EQ(String(sessionId))).Exec(db)
	return err
}

func InvalidateAllSessions(userId string, db *sql.DB) error {
	_, err := UserSessions.DELETE().WHERE(UserSessions.UserID.EQ(String(userId))).Exec(db)
	return err
}

func SetSessionTokenCookie(token string, expiresAt time.Time, w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    token,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Expires:  expiresAt,
		Path:     "/",
	})
}

func DeleteSessionTokenCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   0,
		Path:     "/",
	})
}
