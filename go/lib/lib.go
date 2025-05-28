package lib

import (
	"database/sql"
	"errors"
	"faccina/config"
	"net/http"
)

type State struct {
	Config *config.Config
	DB     *sql.DB
}

// https://blog.questionable.services/article/http-handler-error-handling-revisited
type Error interface {
	error
	Status() int
}

type StatusError struct {
	Code int
	Err  error
}

func (se StatusError) Error() string {
	return se.Err.Error()
}

func (se StatusError) Status() int {
	return se.Code
}

var (
	ErrorGalleryNotFound    = StatusError{http.StatusNotFound, errors.New("Gallery not found")}
	ErrorStatusUnauthorized = StatusError{http.StatusUnauthorized, errors.New(http.StatusText(http.StatusUnauthorized))}
	ErrorStatusForbidden    = StatusError{http.StatusForbidden, errors.New(http.StatusText(http.StatusForbidden))}
)
