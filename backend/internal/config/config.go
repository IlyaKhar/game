package config

import (
	"os"
	"strings"
)

// Config holds runtime settings loaded from environment variables.
type Config struct {
	Port          string
	DatabaseURL   string
	JWTSecret     string
	AdminPassword string
	AllowedOrigin string
}

// Load reads environment variables with sensible local defaults.
func Load() Config {
	return Config{
		Port:          getEnv("PORT", "8080"),
		DatabaseURL:   getEnv("DATABASE_URL", "sqlite://./data/festival.db"),
		JWTSecret:     getEnv("JWT_SECRET", "okei-fest-dev-secret-change-in-prod"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "okei-admin-2026"),
		AllowedOrigin: getEnv("ALLOWED_ORIGIN", "*"),
	}
}

func getEnv(key, fallback string) string {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback
	}
	return val
}

