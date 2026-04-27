package main

import (
	"context"
	"errors"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Brownei/brimble-submission/api"
	"github.com/Brownei/brimble-submission/db"
	"github.com/Brownei/brimble-submission/internal"
	"github.com/lmittmann/tint"
)

func main() {
	// Logger for the terminal
	w := os.Stderr
	logger := slog.New(tint.NewHandler(w, nil))
	slog.SetDefault(slog.New(
		tint.NewHandler(w, &tint.Options{
			Level:      slog.LevelDebug,
			TimeFormat: time.Kitchen,
		}),
	))

	cfg := internal.Load()
	database, err := db.Connect(cfg)
	if err != nil {
		logger.Error("Database connection error", "error", err)
	}
	application := api.NewApplication(logger, database)

	server := &http.Server{
		Addr:    ":3333",
		Handler: application.Run(),
	}

	// Create context that listens for the interrupt signal
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Run server in the background
	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("Server startup unsuccessful", "error", err)
		}
	}()

	logger.Info("The server is running on :3333...")

	// Listen for the interrupt signal
	<-ctx.Done()

	// Create shutdown context with 30-second timeout
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Trigger graceful shutdown
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatal(err)
	}

}
