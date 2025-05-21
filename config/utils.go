package config

import (
	"fmt"
	"reflect"
)

type StringOrArray []string

func (s *StringOrArray) UnmarshalTOML(data any) error {
	switch v := data.(type) {
	case string:
		*s = []string{v}
	case []any:
		slice := []string{}
		for _, item := range v {
			if str, ok := item.(string); ok {
				slice = append(slice, str)
			}
		}
		*s = slice
	default:
		return fmt.Errorf("unsupported type for stringorarray: %v", reflect.TypeOf(data))
	}

	return nil
}
