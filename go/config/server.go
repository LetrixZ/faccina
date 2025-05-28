package config

// TODO: Add logging config
type Server struct {
	AutoUnpack  bool `toml:"auto_unpack"`
	WatchConfig bool `toml:"watch_config"`
}

func setServerDefaults(config *Config) {
	config.Server.WatchConfig = true
}
