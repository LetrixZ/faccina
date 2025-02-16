package main

import (
	"fmt"

	"github.com/stephenafamo/bob"
)

func getDB(config *Config) bob.DB {
	switch config.Database.Vendor {
	case SQLite:
		dbConfig := config.Database.Config.(SQLiteConfig)
		db, err := bob.Open("sqlite", dbConfig.Path)
		checkErr(err)
		return db
	case PostgreSQL:
		panic("PostgreSQL database is not yet supported")
	default:
		panic(fmt.Errorf("Unknown database vendor '%s'", config.Database.Vendor))
	}
}
