package database

import (
	"database/sql"
	"embed"
	"errors"
	"faccina/config"
	"fmt"

	"github.com/go-jet/jet/v2/qrm"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var fs embed.FS

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
		return nil, fmt.Errorf("PostgreSQL is not yet supported '%s'", c.Database.Vendor)
	default:
		return nil, fmt.Errorf("unknown database vendor '%s'", c.Database.Vendor)
	}

	err := db.Ping()
	if err != nil {
		return nil, err
	}

	driver, err := sqlite.WithInstance(db, &sqlite.Config{})
	if err != nil {
		return nil, err
	}

	d, err := iofs.New(fs, "migrations")
	if err != nil {
		return nil, err
	}

	m, err := migrate.NewWithInstance("iofs", d, "sqlite", driver)
	if err != nil {
		return nil, err
	}

	err = m.Up()
	if err != nil {
		if !errors.Is(err, migrate.ErrNoChange) {
			return nil, err
		}
	}

	return db, nil
}
