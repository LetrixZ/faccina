package main

import (
	"context"
	"faccina/config"
	"faccina/database"
	"faccina/server"
	"fmt"
	"log"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/fsnotify/fsnotify"
	"github.com/urfave/cli/v3"
)

func getConfig() (*config.Config, string, error) {
	path := "./config.toml"

	envConfigPath := os.Getenv("CONFIG_FILE")
	if envConfigPath != "" {
		path = envConfigPath
	}

	path, err := filepath.Abs(path)
	if err != nil {
		return &config.Config{}, "", err
	}

	config, err := config.LoadConfig(path)
	return config, path, err
}

func watchConfig(c *config.Config, path string, w *fsnotify.Watcher) {
	for {
		select {
		case event, ok := <-w.Events:
			if !ok {
				return
			}

			if event.Has(fsnotify.Write) {
				newConfig, err := config.LoadConfig(path)
				if err != nil {
					slog.Error(fmt.Sprintf("failed to reload config: %v", err))
					return
				}

				slog.Info("config file changed")

				if !newConfig.Server.WatchConfig {
					slog.Info("config watcher disabled, new changes won't be detected")
					w.Close()
					return
				}

				*c = *newConfig
			}
		}
	}
}

func startServer(ctx context.Context, cmd *cli.Command) error {
	c, path, err := getConfig()
	if err != nil {
		return err
	}

	if c.Server.WatchConfig {
		watcher, err := fsnotify.NewWatcher()
		if err != nil {
			return err
		}
		defer watcher.Close()

		go watchConfig(c, path, watcher)

		err = watcher.Add(path)
		if err != nil {
			return err
		}
	}

	db, err := database.GetDatabase(c)
	if err != nil {
		return err
	}
	defer db.Close()

	host := os.Getenv("HOST")
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	err = server.Start(host, port, c, db)
	if err != nil {
		return err
	}

	return nil
}

func main() {
	cmd := &cli.Command{
		Action: startServer,
	}

	if err := cmd.Run(context.Background(), os.Args); err != nil {
		log.Fatalln(err)
	}
}
