package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type ResponseMessage struct {
	Message string `json:"message"`
}

func addFieldIfNotNil(fields *[]string, k string, value interface{}) {
	switch v := value.(type) {
	case *int:
		if v != nil {
			*fields = append(*fields, fmt.Sprintf("%s:%v", k, *v))
		}
	case *bool:
		if v != nil {
			*fields = append(*fields, fmt.Sprintf("%s:%v", k, *v))
		}
	case *string:
		if v != nil {
			*fields = append(*fields, fmt.Sprintf("%s:%s", k, *v))
		}
	}
}

func fileNameWithoutExtension(fileName string) string {
	if pos := strings.LastIndexByte(fileName, '.'); pos != -1 {
		return fileName[:pos]
	}
	return fileName
}

func checkErr(e error) {
	if e != nil {
		panic(e)
	}
}

func checkErrResponse(message string, statusCode int, err error, w http.ResponseWriter) {
	fmt.Println(err)
	w.WriteHeader(statusCode)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ResponseMessage{
		Message: message,
	})
}

func leadingZeros(number int, count int) string {
	numberStr := strconv.Itoa(number)
	return strings.Repeat("0", len(strconv.Itoa(count))-len(numberStr)) + strconv.Itoa(number)
}

func saveFile(path string, contents []byte) error {
	err := os.MkdirAll(filepath.Dir(path), os.ModePerm)

	if err != nil {
		return fmt.Errorf("Failed to create directory: %s", err)
	}

	err = os.WriteFile(path, contents, 0644)

	if err != nil {
		return fmt.Errorf("Failed to write file: %s", err)
	}

	return nil
}
