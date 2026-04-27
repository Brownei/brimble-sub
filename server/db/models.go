package db

import (
	"time"

	"gorm.io/gorm"
)

type Deployment struct {
	gorm.Model
	ID          uint       `gorm:"primarykey" json:"id"`
	UUID        string     `gorm:"uniqueIndex" json:"uuid"`
	Name        string     `json:"name"`
	GitURL      string     `json:"git_url,omitempty"`
	Branch      string     `json:"branch"`
	Status      string     `json:"status"` // pending, building, deploying, running, failed
	ImageTag    string     `json:"image_tag"`
	LiveURL     string     `json:"live_url"`
	Port        int        `json:"port"`
	Error       string     `json:"error,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

type LogEntry struct {
	gorm.Model
	ID           uint      `gorm:"primarykey" json:"id"`
	DeploymentID uint      `json:"deployment_id"`
	Message      string    `json:"message"`
	Stream       string    `json:"stream"` // stdout, stderr
	Timestamp    time.Time `json:"timestamp"`
}
