package internal

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	AppPort     string
	ClientRoute string
}

func Load() *Config {
	godotenv.Load()

	return &Config{
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      getEnv("DB_USER", "db"),
		DBPassword:  getEnv("DB_PASSWORD", "db"),
		DBName:      getEnv("DB_NAME", "db"),
		AppPort:     getEnv("APP_PORT", "8081"),
		ClientRoute: getEnv("CLIENT_URL", "http://localhost:3000"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
