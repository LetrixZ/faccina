package database

import (
	"database/sql"
	"faccina/config"
	"fmt"

	"github.com/go-jet/jet/v2/qrm"
	_ "github.com/jackc/pgx/v5/stdlib"
	_ "modernc.org/sqlite"
)

func GetDatabase(c *config.Config) (*sql.DB, error) {
	qrm.GlobalConfig.StrictScan = true

	var db *sql.DB

	switch c.Database.Vendor {
	case config.SQLite:
		config := c.Database.Config.(config.SQLiteConfig)
		_db, err := sql.Open("sqlite", config.Path)
		if err != nil {
			return nil, err
		}

		db = _db
	case config.PostgreSQL:
		config := c.Database.Config.(config.PostgreSQLConfig)
		_db, err := sql.Open("pgx", config.ConnectionString)
		if err != nil {
			return nil, err
		}

		db = _db
	default:
		return nil, fmt.Errorf("unknown database vendor '%s'", c.Database.Vendor)
	}

	err := db.Ping()
	if err != nil {
		return nil, err
	}

	return db, nil
}
