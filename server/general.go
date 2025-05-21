package server

import (
	"encoding/json"
	"errors"
	"faccina/auth"
	"faccina/gen/model"
	. "faccina/gen/table"
	. "faccina/lib"
	"net/http"
	"time"

	"github.com/go-jet/jet/v2/qrm"
	. "github.com/go-jet/jet/v2/sqlite"
)

func uliHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	code := r.PathValue("code")

	stmt := UserCodes.SELECT(UserCodes.UserID).WHERE(
		AND(
			UserCodes.Code.EQ(String(code)),
			UserCodes.Type.EQ(String("login")),
			UserCodes.ConsumedAt.IS_NULL()),
	)

	var user model.UserCodes
	err := stmt.Query(state.DB, &user)
	if err != nil {
		if err == qrm.ErrNoRows {
			return StatusError{400, errors.New("Invalid login token")}
		} else {
			return err
		}
	}

	token := auth.GenerateSessionToken()
	expiresAt, err := auth.CreateSession(token, user.UserID, state.DB)
	if err != nil {
		return err
	}

	auth.SetSessionTokenCookie(token, expiresAt, w, r)

	_, err = UserCodes.UPDATE(UserCodes.ConsumedAt).SET(time.Now()).WHERE(UserCodes.Code.EQ(String(code))).Exec(state.DB)
	if err != nil {
		return err
	}

	http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
	return nil
}

func readPageHandler(state *State, w http.ResponseWriter, r *http.Request) error {
	if userSession, ok := r.Context().Value("userSession").(*auth.UserSession); ok {
		var stat struct {
			ArchiveId  int32 `json:"archiveId"`
			IsLastPage bool  `json:"isLastPage"`
			PageNumber int32 `json:"pageNumber"`
		}

		err := json.NewDecoder(r.Body).Decode(&stat)
		if err != nil {
			return err
		}

		whereExpr := AND(
			UserReadHistory.ArchiveID.EQ(Int32(stat.ArchiveId)),
			UserReadHistory.UserID.EQ(String(userSession.User.Id)),
		)

		var finishedAt *time.Time
		if stat.IsLastPage {
			now := time.Now()
			finishedAt = &now
		}

		stmt := UserReadHistory.SELECT(UserReadHistory.FinishedAt.AS("finished_at")).WHERE(whereExpr)

		var historyEntry struct {
			FinishedAt *time.Time
		}

		err = stmt.Query(state.DB, &historyEntry)
		if err == nil {
			if historyEntry.FinishedAt != nil {
				stmt := UserReadHistory.UPDATE(
					UserReadHistory.LastReadAt,
					UserReadHistory.LastPage,
					UserReadHistory.MaxPage,
				).SET(
					time.Now(),
					stat.PageNumber,
					Func("MAX", UserReadHistory.MaxPage, Int32(stat.PageNumber)),
				).WHERE(whereExpr)

				_, err := stmt.Exec(state.DB)
				if err != nil {
					return err
				}
			} else {
				stmt := UserReadHistory.UPDATE(
					UserReadHistory.LastReadAt,
					UserReadHistory.LastPage,
					UserReadHistory.MaxPage,
					UserReadHistory.FinishedAt,
				).SET(
					time.Now(),
					stat.PageNumber,
					Func("MAX", UserReadHistory.MaxPage, Int32(stat.PageNumber)),
					finishedAt,
				).WHERE(whereExpr)

				_, err := stmt.Exec(state.DB)
				if err != nil {
					return err

				}
			}
		} else if err == qrm.ErrNoRows {
			stmt := UserReadHistory.INSERT(
				UserReadHistory.ArchiveID,
				UserReadHistory.StartPage,
				UserReadHistory.LastPage,
				UserReadHistory.MaxPage,
				UserReadHistory.FinishedAt,
				UserReadHistory.UserID,
			).VALUES(
				stat.ArchiveId,
				stat.PageNumber,
				stat.PageNumber,
				stat.PageNumber,
				finishedAt,
				userSession.User.Id,
			)

			_, err := stmt.Exec(state.DB)
			if err != nil {
				return err
			}
		} else {
			return err
		}

	} else {
		w.WriteHeader(http.StatusOK)
	}

	return nil
}

func registerGeneralRoutes(mux *http.ServeMux, state *State) {
	mux.Handle("GET /image/{hash}/{page}", Handler{state, imageHandler})
	mux.Handle("GET /uli/{code}", Handler{state, uliHandler})
	mux.Handle("POST /stats/read-page", Handler{state, readPageHandler})
}
