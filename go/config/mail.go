package config

type Mailer struct {
	Host   string `toml:"host"`
	Port   int    `toml:"port"`
	Secure bool   `toml:"secure"`
	User   string `toml:"user"`
	Pass   string `toml:"pass"`
	From   string `toml:"from"`
}
