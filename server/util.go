package server

import (
	"errors"
	"faccina/auth"
	. "faccina/lib"
	"net/http"
	"strconv"
)

func getIntParam(param string, r *http.Request) (int, error) {
	value := r.PathValue(param)
	return strconv.Atoi(value)
}

func getParamID(r *http.Request) (int32, error) {
	id, err := getIntParam("id", r)
	if err != nil {
		return 0, StatusError{http.StatusBadRequest, errors.New("The given ID is not a valid value")}
	}
	return int32(id), nil
}

func getRequestUser(r *http.Request) (auth.User, bool) {
	if userSession, ok := r.Context().Value("userSession").(*auth.UserSession); ok {
		return userSession.User, true
	}
	return auth.User{}, false
}
