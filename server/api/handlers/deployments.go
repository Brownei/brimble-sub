package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Brownei/brimble-submission/db/models"
	"github.com/Brownei/brimble-submission/internal/services"
	"github.com/Brownei/brimble-submission/types"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type DeploymentHandler struct {
	db                *gorm.DB
	deploymentService *services.DeploymentService
	eventBuffer       *services.EventBuffer
}

func NewDeploymentsService(db *gorm.DB, deploymentService *services.DeploymentService) *DeploymentHandler {
	return &DeploymentHandler{
		db:                db,
		deploymentService: deploymentService,
		eventBuffer:       deploymentService.GetEventBuffer(),
	}
}

func (d *DeploymentHandler) ListDeployments(w http.ResponseWriter, r *http.Request) {
	var deployments []models.Deployment
	if err := d.db.Order("created_at desc").Find(&deployments).Error; err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(deployments)
}

func (d *DeploymentHandler) GetDeployment(w http.ResponseWriter, r *http.Request) {
	uuid := chi.URLParam(r, "uuid")

	var deployment models.Deployment
	if err := d.db.Where("uuid = ?", uuid).First(&deployment).Error; err != nil {
		http.Error(w, "Deployment not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(deployment)
}

func (d *DeploymentHandler) CreateDeploymentFromGitHandler(w http.ResponseWriter, r *http.Request) {
	var req types.DeploymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.GitURL == "" {
		http.Error(w, "Name and git_url are required", http.StatusBadRequest)
		return
	}

	deployment, err := d.deploymentService.CreateDeploymentFromGit(r.Context(), types.DeploymentRequest(req))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(deployment)
}

func (d *DeploymentHandler) CreateDeploymentFromUploadHandler(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil { // 32MB max
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	name := r.FormValue("name")
	port := 0
	fmt.Sscanf(r.FormValue("port"), "%d", &port)

	if name == "" || port == 0 {
		http.Error(w, "Name and port are required", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("project")
	if err != nil {
		http.Error(w, "Project file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	req := types.UploadRequest{
		Name: name,
		Port: port,
	}

	deployment, err := d.deploymentService.CreateDeploymentFromUpload(r.Context(), req, file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(deployment)
}

func (d *DeploymentHandler) StreamLogs(w http.ResponseWriter, r *http.Request) {
	uuid := chi.URLParam(r, "uuid")

	// Verify deployment exists
	var deployment models.Deployment
	if err := d.db.Where("uuid = ?", uuid).First(&deployment).Error; err != nil {
		http.Error(w, "Deployment not found", http.StatusNotFound)
		return
	}

	// Setup SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	// Subscribe to events (both logs and status updates)
	eventCh := d.eventBuffer.Subscribe(uuid)
	defer d.eventBuffer.Unsubscribe(uuid, eventCh)

	// Keep connection open and stream events
	for {
		select {
		case <-r.Context().Done():
			return
		case event := <-eventCh:
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}

func (d *DeploymentHandler) GetDeploymentLogs(w http.ResponseWriter, r *http.Request) {
	uuid := chi.URLParam(r, "uuid")

	// Look up the deployment by UUID
	var deployment models.Deployment
	if err := d.db.Where("uuid = ?", uuid).First(&deployment).Error; err != nil {
		http.Error(w, "Deployment not found", http.StatusNotFound)
		return
	}

	// Fetch logs from database for persistence
	var logs []models.LogEntry
	if err := d.db.Where("deployment_id = ?", deployment.ID).Order("timestamp asc").Find(&logs).Error; err != nil {
		http.Error(w, "Failed to fetch logs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

func (d *DeploymentHandler) DeleteDeployment(w http.ResponseWriter, r *http.Request) {
	uuid := chi.URLParam(r, "uuid")

	// Look up the deployment
	var deployment models.Deployment
	if err := d.db.Where("uuid = ?", uuid).First(&deployment).Error; err != nil {
		http.Error(w, "Deployment not found", http.StatusNotFound)
		return
	}

	// Delete associated logs first
	if err := d.db.Where("deployment_id = ?", deployment.ID).Delete(&models.LogEntry{}).Error; err != nil {
		http.Error(w, "Failed to delete deployment logs", http.StatusInternalServerError)
		return
	}

	// Delete the deployment
	if err := d.db.Delete(&deployment).Error; err != nil {
		http.Error(w, "Failed to delete deployment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
