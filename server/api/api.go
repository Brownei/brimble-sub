package api

import (
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/Brownei/brimble-submission/api/handlers"
	"github.com/Brownei/brimble-submission/internal"
	"github.com/Brownei/brimble-submission/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"gorm.io/gorm"
)

type Application struct {
	logger *slog.Logger
	db     *gorm.DB
}

func NewApplication(logger *slog.Logger, DB *gorm.DB) *Application {
	return &Application{
		logger: logger,
		db:     DB,
	}
}

func (a *Application) Run() http.Handler {
	r := chi.NewRouter()

	// A good base middleware stack
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	// r.Use(middleware.Logger)
	r.Use(internal.SlogMiddleware(a.logger))
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Set a timeout value on the request context (ctx), that will signal
	// through ctx.Done() that the request has timed out and further
	// processing should be stopped.
	r.Use(middleware.Timeout(60 * time.Second))

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Welcome to Brownson's Brimble submission. Accessing this api is through the /v1 route please"))
	})

	// Create working directory
	workingDir := "./deployments"
	if err := os.MkdirAll(workingDir, 0755); err != nil {
		a.logger.Error("Failed to create working directory:", "error", err)
	}
	deploymentsService := services.NewDeploymentService(a.db, workingDir)

	// DEPLOYMENTS HANDLER
	deploymentHandler := handlers.NewDeploymentsService(a.db, deploymentsService)

	// RESTy routes for "articles" resource
	r.Route("/v1", func(r chi.Router) {
		r.Get("/deployments", deploymentHandler.ListDeployments)
		r.Get("/deployments/{uuid}", deploymentHandler.GetDeployment)
		r.Post("/deployments/git", deploymentHandler.CreateDeploymentFromGitHandler)
		r.Post("/deployments/upload", deploymentHandler.CreateDeploymentFromUploadHandler)
		r.Delete("/deployments/{uuid}", deploymentHandler.DeleteDeployment)
		r.Get("/deployments/{uuid}/logs", deploymentHandler.GetDeploymentLogs)
		r.Get("/deployments/{uuid}/logs/stream", deploymentHandler.StreamLogs)

	})

	return r
}
