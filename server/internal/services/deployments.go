package services

import (
	"context"
	"fmt"
	"io"
	"math/rand"
	"os"
	"path/filepath"
	"time"

	"github.com/Brownei/brimble-submission/db/models"
	"github.com/Brownei/brimble-submission/types"
	"github.com/google/uuid"

	"gorm.io/gorm"
)

// Mock build steps for realistic Docker build output
var mockDockerBuildSteps = []string{
	"Step 1/15 : FROM node:18-alpine",
	" ---> Pulling base image...",
	" ---> 6e78d3e3f2c1",
	"Step 2/15 : WORKDIR /app",
	" ---> Running in 8a9b2c3d4e5f",
	" ---> 9f8e7d6c5b4a",
	"Step 3/15 : COPY package*.json ./",
	" ---> 2a3b4c5d6e7f",
	"Step 4/15 : RUN npm ci --only=production",
	" ---> Running in 1b2c3d4e5f6a",
	"added 127 packages in 3.2s",
	" ---> 3c4d5e6f7g8h",
	"Step 5/15 : COPY . .",
	" ---> 4d5e6f7g8h9i",
	"Step 6/15 : RUN npm run build",
	" ---> Running in 5e6f7g8h9i0j",
	"> build",
	"> tsc && vite build",
	"vite v4.3.9 building for production...",
	"transforming (42) modules...",
	"✓ 42 modules transformed.",
	"dist/                     0.05 kB │ gzip: 0.07 kB",
	"dist/assets/index-*.js    142.35 kB │ gzip: 45.12 kB",
	"dist/assets/index-*.css   3.21 kB │ gzip: 1.45 kB",
	"built in 2.84s.",
	" ---> 6f7g8h9i0j1k",
	"Step 7/15 : EXPOSE 8080",
	" ---> 7g8h9i0j1k2l",
	"Step 8/15 : ENV NODE_ENV=production",
	" ---> 8h9i0j1k2l3m",
	"Step 9/15 : CMD [\"npm\", \"start\"]",
	" ---> 9i0j1k2l3m4n",
	"Successfully built %s",
	"Successfully tagged %s",
}

// Mock failure scenarios
var mockFailureScenarios = []struct {
	step    int
	message string
}{
	{3, "npm ERR! code E404 npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-pkg - Not found"},
	{5, "gcc: error: unrecognized command line option '-std=c++20'"},
	{7, "Error: Cannot find module 'typescript'"},
	{9, "SyntaxError: Unexpected token 'export'"},
	{11, "The command '/bin/sh -c npm run build' returned a non-zero code: 1"},
	{4, "go: go.mod file not found in current directory"},
}

type DeploymentService struct {
	db                *gorm.DB
	eventBuffer       *EventBuffer
	deploymentIDCache map[string]uint // UUID -> ID cache for DB inserts
	uploadDir         string          // Directory to save uploaded files
}

func NewDeploymentService(db *gorm.DB, workingDir string) *DeploymentService {
	// Create upload directory
	uploadDir := filepath.Join(workingDir, "uploads")
	os.MkdirAll(uploadDir, 0755)

	return &DeploymentService{
		db:                db,
		eventBuffer:       NewEventBuffer(),
		deploymentIDCache: make(map[string]uint),
		uploadDir:         uploadDir,
	}
}

func (dm *DeploymentService) GetEventBuffer() *EventBuffer {
	return dm.eventBuffer
}

// GetLogBuffer returns the event buffer for backward compatibility
func (dm *DeploymentService) GetLogBuffer() *EventBuffer {
	return dm.eventBuffer
}

func (dm *DeploymentService) CreateDeploymentFromGit(ctx context.Context, req types.DeploymentRequest) (*models.Deployment, error) {
	deployment := &models.Deployment{
		UUID:     uuid.New().String(),
		Name:     req.Name,
		GitURL:   req.GitURL,
		Branch:   req.Branch,
		Port:     req.Port,
		Status:   "pending",
		ImageTag: fmt.Sprintf("%s:%s", req.Name, time.Now().Format("20060102150405")),
		LiveURL:  fmt.Sprintf("http://localhost:%d", req.Port),
	}

	if deployment.Branch == "" {
		deployment.Branch = "main"
	}

	if err := dm.db.Create(deployment).Error; err != nil {
		return nil, err
	}

	// Start mock deployment process asynchronously
	go dm.mockProcessDeployment(deployment)

	return deployment, nil
}

func (dm *DeploymentService) CreateDeploymentFromUpload(ctx context.Context, req types.UploadRequest, uploadedFile io.Reader) (*models.Deployment, error) {
	deployment := &models.Deployment{
		UUID:     uuid.New().String(),
		Name:     req.Name,
		Port:     req.Port,
		Status:   "pending",
		ImageTag: fmt.Sprintf("%s:%s", req.Name, time.Now().Format("20060102150405")),
		LiveURL:  fmt.Sprintf("http://localhost:%d", req.Port),
	}

	if err := dm.db.Create(deployment).Error; err != nil {
		return nil, err
	}

	// Save uploaded file for realism
	filePath := filepath.Join(dm.uploadDir, fmt.Sprintf("%s.zip", deployment.UUID))
	go dm.saveUploadedFile(uploadedFile, filePath, deployment)

	return deployment, nil
}

// saveUploadedFile saves the uploaded file and then starts the deployment
func (dm *DeploymentService) saveUploadedFile(file io.Reader, filePath string, deployment *models.Deployment) {
	// Create the file
	out, err := os.Create(filePath)
	if err != nil {
		dm.addLog(deployment.UUID, fmt.Sprintf("Warning: Could not save uploaded file: %v", err), "stderr")
		// Continue anyway - it's mock mode
	} else {
		defer out.Close()

		// Copy the uploaded content
		n, err := io.Copy(out, file)
		if err != nil {
			dm.addLog(deployment.UUID, fmt.Sprintf("Warning: Could not save uploaded file content: %v", err), "stderr")
		} else {
			dm.addLog(deployment.UUID, fmt.Sprintf("Uploaded file saved: %d bytes", n), "stdout")
		}
	}

	// Start the deployment process
	dm.mockProcessUploadedDeployment(deployment, filePath)
}

// mockProcessDeployment simulates a git-based deployment with realistic timing
func (dm *DeploymentService) mockProcessDeployment(deployment *models.Deployment) {
	dm.addLog(deployment.UUID, "Starting deployment process...", "stdout")

	// Update status to building
	dm.updateDeploymentStatus(deployment, "building", "")
	dm.sendStatusUpdate(deployment)

	// Simulate git clone
	dm.addLog(deployment.UUID, fmt.Sprintf("Downloading repository from: %s (branch: %s)", deployment.GitURL, deployment.Branch), "stdout")
	time.Sleep(1 * time.Second)
	dm.addLog(deployment.UUID, "Cloning into '.'...", "stdout")
	time.Sleep(800 * time.Millisecond)
	dm.addLog(deployment.UUID, "remote: Enumerating objects: 142, done.", "stdout")
	time.Sleep(200 * time.Millisecond)
	dm.addLog(deployment.UUID, "remote: Counting objects: 100% (142/142), done.", "stdout")
	time.Sleep(300 * time.Millisecond)
	dm.addLog(deployment.UUID, "Receiving objects: 100% (142/142), 45.32 KiB | 2.15 MiB/s, done.", "stdout")
	time.Sleep(100 * time.Millisecond)
	dm.addLog(deployment.UUID, "Resolving deltas: 100% (89/89), done.", "stdout")
	dm.addLog(deployment.UUID, "Repository downloaded successfully", "stdout")

	// Run mock Docker build
	dm.mockDockerBuild(deployment)
}

// mockProcessUploadedDeployment simulates an upload-based deployment
func (dm *DeploymentService) mockProcessUploadedDeployment(deployment *models.Deployment, filePath string) {
	dm.addLog(deployment.UUID, "Processing uploaded project...", "stdout")
	dm.updateDeploymentStatus(deployment, "building", "")
	dm.sendStatusUpdate(deployment)

	// Get file info for realism
	if info, err := os.Stat(filePath); err == nil {
		dm.addLog(deployment.UUID, fmt.Sprintf("Archive size: %d bytes", info.Size()), "stdout")
	}

	// Simulate file extraction
	dm.addLog(deployment.UUID, "Extracting project files...", "stdout")
	time.Sleep(500 * time.Millisecond)
	dm.addLog(deployment.UUID, "Archive: source.zip", "stdout")
	time.Sleep(200 * time.Millisecond)
	dm.addLog(deployment.UUID, "  inflating: package.json", "stdout")
	time.Sleep(100 * time.Millisecond)
	dm.addLog(deployment.UUID, "  inflating: src/index.ts", "stdout")
	time.Sleep(100 * time.Millisecond)
	dm.addLog(deployment.UUID, "  inflating: README.md", "stdout")
	time.Sleep(100 * time.Millisecond)
	dm.addLog(deployment.UUID, "Project files extracted", "stdout")

	// Run mock Docker build
	dm.mockDockerBuild(deployment)

	// Cleanup uploaded file after deployment (async)
	go func() {
		time.Sleep(5 * time.Minute) // Keep for 5 minutes then cleanup
		os.Remove(filePath)
	}()
}

// mockDockerBuild simulates a Docker build with realistic output and random failures
func (dm *DeploymentService) mockDockerBuild(deployment *models.Deployment) {
	dm.updateDeploymentStatus(deployment, "building", "")
	dm.sendStatusUpdate(deployment)
	dm.addLog(deployment.UUID, fmt.Sprintf("Building Docker image: %s", deployment.ImageTag), "stdout")
	dm.addLog(deployment.UUID, "", "stdout")

	// Determine if this build should fail (20% failure rate)
	shouldFail := rand.Float32() < 0.2
	var failureStep int
	var failureMessage string

	if shouldFail {
		failureScenario := mockFailureScenarios[rand.Intn(len(mockFailureScenarios))]
		failureStep = failureScenario.step
		failureMessage = failureScenario.message
	}

	// Simulate build steps
	for i, step := range mockDockerBuildSteps {
		// Check if we should fail at this step
		if shouldFail && i == failureStep {
			dm.addLog(deployment.UUID, failureMessage, "stderr")
			dm.handleDeploymentFailure(deployment, fmt.Sprintf("Docker build failed: %s", failureMessage))
			return
		}

		// Format step with image tag if needed
		logMessage := step
		if i == len(mockDockerBuildSteps)-2 {
			logMessage = fmt.Sprintf(step, deployment.ImageTag)
		} else if i == len(mockDockerBuildSteps)-1 {
			logMessage = fmt.Sprintf(step, deployment.ImageTag)
		}

		dm.addLog(deployment.UUID, logMessage, "stdout")

		// Variable delay between steps for realism (100ms to 800ms)
		delay := time.Duration(100+rand.Intn(700)) * time.Millisecond
		time.Sleep(delay)
	}

	dm.addLog(deployment.UUID, "Docker image built successfully", "stdout")

	// Simulate container deployment
	dm.mockDeployContainer(deployment)
}

// mockDeployContainer simulates container deployment
func (dm *DeploymentService) mockDeployContainer(deployment *models.Deployment) {
	dm.updateDeploymentStatus(deployment, "deploying", "")
	dm.sendStatusUpdate(deployment)
	dm.addLog(deployment.UUID, fmt.Sprintf("Deploying container on port %d", deployment.Port), "stdout")

	time.Sleep(500 * time.Millisecond)
	dm.addLog(deployment.UUID, fmt.Sprintf("Creating container %s...", deployment.UUID[:12]), "stdout")
	time.Sleep(300 * time.Millisecond)
	dm.addLog(deployment.UUID, fmt.Sprintf("Container %s created", deployment.UUID[:12]), "stdout")
	time.Sleep(200 * time.Millisecond)
	dm.addLog(deployment.UUID, "Starting container...", "stdout")
	time.Sleep(400 * time.Millisecond)
	dm.addLog(deployment.UUID, fmt.Sprintf("Container started on port %d", deployment.Port), "stdout")
	dm.addLog(deployment.UUID, "Container deployed successfully", "stdout")

	// Update status to running
	now := time.Now()
	deployment.Status = "running"
	deployment.CompletedAt = &now
	dm.db.Save(deployment)
	dm.sendStatusUpdate(deployment)

	dm.addLog(deployment.UUID, fmt.Sprintf("Deployment completed! Live URL: %s", deployment.LiveURL), "stdout")
}

func (dm *DeploymentService) handleDeploymentFailure(deployment *models.Deployment, errMsg string) {
	dm.addLog(deployment.UUID, fmt.Sprintf("ERROR: %s", errMsg), "stderr")

	deployment.Status = "failed"
	deployment.Error = errMsg
	now := time.Now()
	deployment.CompletedAt = &now
	dm.db.Save(deployment)
	dm.sendStatusUpdate(deployment)
}

func (dm *DeploymentService) updateDeploymentStatus(deployment *models.Deployment, status, errorMsg string) {
	deployment.Status = status
	if errorMsg != "" {
		deployment.Error = errorMsg
	}
	dm.db.Save(deployment)
}

// sendStatusUpdate sends a status update event via SSE
func (dm *DeploymentService) sendStatusUpdate(deployment *models.Deployment) {
	dm.eventBuffer.AddStatusUpdate(deployment.UUID, deployment.Status, deployment.LiveURL, deployment.Error)
}

func (dm *DeploymentService) addLog(deploymentUUID string, message, stream string) error {
	dm.eventBuffer.AddLog(deploymentUUID, message, stream)

	// Get deployment ID from cache or DB
	deploymentID, ok := dm.deploymentIDCache[deploymentUUID]
	if !ok {
		// Cache miss - lookup in DB (happens only once per deployment)
		var deployment models.Deployment
		if err := dm.db.Where("uuid = ?", deploymentUUID).First(&deployment).Error; err != nil {
			return fmt.Errorf("failed to find deployment: %w", err)
		}
		deploymentID = deployment.ID
		dm.deploymentIDCache[deploymentUUID] = deploymentID
	}

	// Store in database for persistence
	logEntry := models.LogEntry{
		DeploymentID: deploymentID,
		Message:      message,
		Stream:       stream,
		Timestamp:    time.Now(),
	}
	if err := dm.db.Create(&logEntry).Error; err != nil {
		return err
	}

	return nil
}
