package config

import (
	"errors"
	"fmt"
	"strings"

	"github.com/BurntSushi/toml"
)

type DatabaseVendor string

const (
	SQLite     DatabaseVendor = "sqlite"
	PostgreSQL DatabaseVendor = "postgresql"
)

type SQLiteConfig struct {
	Path string
}

type PostgreSQLConfig struct {
	ConnectionString string
}

type Database struct {
	Vendor DatabaseVendor `toml:"vendor"`
	Config any            `toml:"-"`
}

func (o *SQLiteConfig) UnmarshalTOML(data any) error {
	d, _ := data.(map[string]any)["database"].(map[string]any)

	path, exists := d["path"]
	if !exists || path == nil {
		return errors.New("SQLite: no path given")
	}

	pathStr, ok := path.(string)
	if !ok || pathStr == "" {
		return errors.New("SQLite: no path given")
	}

	o.Path = pathStr

	return nil
}

func (o *PostgreSQLConfig) UnmarshalTOML(data any) error {
	d, _ := data.(map[string]any)["database"].(map[string]any)

	conn := []string{}

	host, ok := d["host"]
	if !ok {
		return errors.New("PostgreSQL: no host given")
	}

	hostStr, ok := host.(string)
	if !ok {
		return errors.New("PostgreSQL: no host given")
	}

	conn = append(conn, fmt.Sprintf("host=%s", hostStr))

	if port, ok := d["port"]; ok {
		conn = append(conn, fmt.Sprintf("port=%s", port))
	}

	if user, ok := d["user"].(string); ok {
		conn = append(conn, fmt.Sprintf("user=%s", user))
	}

	if user, ok := d["pass"].(string); ok {
		conn = append(conn, fmt.Sprintf("password=%s", user))
	}

	database, ok := d["database"]
	if !ok {
		return errors.New("PostgreSQL: no database given")
	}

	databaseStr, ok := database.(string)
	if !ok {
		return errors.New("PostgreSQL: no database given")
	}

	conn = append(conn, fmt.Sprintf("database=%s", databaseStr))

	o.ConnectionString = strings.Join(conn, " ")

	return nil
}

func loadDatabaseConfig(bytes []byte, config *Config) error {
	switch config.Database.Vendor {
	case SQLite:
		var sqliteConfig SQLiteConfig
		err := toml.Unmarshal(bytes, &sqliteConfig)
		if err != nil {
			return err
		}

		config.Database.Config = sqliteConfig
	case PostgreSQL:
		var postgresConfig PostgreSQLConfig
		err := toml.Unmarshal(bytes, &postgresConfig)
		if err != nil {
			return err
		}

		config.Database.Config = postgresConfig
	default:
		return fmt.Errorf("unknown database vendor '%s'", config.Database.Vendor)
	}

	return nil
}
