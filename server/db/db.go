package db

import (
	"fmt"
	"log"

	"github.com/Brownei/brimble-submission/db/models"
	"github.com/Brownei/brimble-submission/internal"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *internal.Config) (*gorm.DB, error) {
	routineErr := make(chan error, 1)
	models := []interface{}{
		&models.Deployment{},
		&models.LogEntry{},
	}

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Connected to database successfully")

	// dropTables(db)

	go func() {
		for _, model := range models {
			hasTable := db.Migrator().HasTable(model)
			if hasTable == true {
				fmt.Print("Skipping adding this model......")
				continue
			}
			if err := db.Migrator().CreateTable(model); err != nil {
				fmt.Print(err)
				routineErr <- err
				return
			}
		}

		routineErr <- nil
	}()

	if err := <-routineErr; err != nil {
		return nil, fmt.Errorf("failed to migrate database: %v", err)
	} else {
		log.Println("Database migration completed")
	}

	return db, nil
}
