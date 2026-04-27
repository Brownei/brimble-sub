package services

import (
	"sync"
	"time"

	"github.com/Brownei/brimble-submission/db/models"
)

// EventType represents the type of SSE event
type EventType string

const (
	EventTypeLog    EventType = "log"
	EventTypeStatus EventType = "status"
)

// StreamEvent represents a generic event that can be either a log or status update
type StreamEvent struct {
	Type      EventType     `json:"type"`
	Timestamp time.Time     `json:"timestamp"`
	Log       *LogEventData `json:"log,omitempty"`
	Status    *StatusData   `json:"status,omitempty"`
}

// LogEventData contains log-specific data
type LogEventData struct {
	Message string `json:"message"`
	Stream  string `json:"stream"` // stdout, stderr
}

// StatusData contains status update data
type StatusData struct {
	Status  string `json:"status"` // pending, building, deploying, running, failed
	LiveURL string `json:"live_url,omitempty"`
	Error   string `json:"error,omitempty"`
}

// EventBuffer stores both logs and status events for SSE streaming
type EventBuffer struct {
	mu          sync.RWMutex
	events      map[string][]StreamEvent      // deploymentUUID -> events
	subscribers map[string][]chan StreamEvent // deploymentUUID -> channels
}

func NewEventBuffer() *EventBuffer {
	return &EventBuffer{
		events:      make(map[string][]StreamEvent),
		subscribers: make(map[string][]chan StreamEvent),
	}
}

// AddLog adds a log entry as an event
func (eb *EventBuffer) AddLog(deploymentUUID string, message string, stream string) {
	event := StreamEvent{
		Type:      EventTypeLog,
		Timestamp: time.Now(),
		Log: &LogEventData{
			Message: message,
			Stream:  stream,
		},
	}

	eb.addEvent(deploymentUUID, event)
}

// AddStatusUpdate adds a status update as an event
func (eb *EventBuffer) AddStatusUpdate(deploymentUUID string, status string, liveURL string, error string) {
	event := StreamEvent{
		Type:      EventTypeStatus,
		Timestamp: time.Now(),
		Status: &StatusData{
			Status:  status,
			LiveURL: liveURL,
			Error:   error,
		},
	}

	eb.addEvent(deploymentUUID, event)
}

// addEvent adds an event to the buffer and notifies subscribers
func (eb *EventBuffer) addEvent(deploymentUUID string, event StreamEvent) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	// Store in buffer (keep last 1000 events per deployment)
	if len(eb.events[deploymentUUID]) > 1000 {
		eb.events[deploymentUUID] = eb.events[deploymentUUID][1:]
	}
	eb.events[deploymentUUID] = append(eb.events[deploymentUUID], event)

	// Notify subscribers
	for _, ch := range eb.subscribers[deploymentUUID] {
		select {
		case ch <- event:
		default:
			// Skip if channel is full
		}
	}
}

// Subscribe creates a new subscription for a deployment's events
func (eb *EventBuffer) Subscribe(deploymentUUID string) <-chan StreamEvent {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	ch := make(chan StreamEvent, 100)
	eb.subscribers[deploymentUUID] = append(eb.subscribers[deploymentUUID], ch)
	return ch
}

// Unsubscribe removes a subscription and closes the channel
func (eb *EventBuffer) Unsubscribe(deploymentUUID string, ch <-chan StreamEvent) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	channels := eb.subscribers[deploymentUUID]
	for i, c := range channels {
		if c == ch {
			eb.subscribers[deploymentUUID] = append(channels[:i], channels[i+1:]...)
			close(c)
			break
		}
	}
}

// GetLogs extracts just the log events from the event history
func (eb *EventBuffer) GetLogs(deploymentUUID string) []models.LogEntry {
	eb.mu.RLock()
	defer eb.mu.RUnlock()

	var logs []models.LogEntry
	for _, event := range eb.events[deploymentUUID] {
		if event.Type == EventTypeLog && event.Log != nil {
			logs = append(logs, models.LogEntry{
				Message:   event.Log.Message,
				Stream:    event.Log.Stream,
				Timestamp: event.Timestamp,
			})
		}
	}
	return logs
}

// LogBuffer is an alias for backward compatibility
type LogBuffer = EventBuffer

// NewLogBuffer is an alias for backward compatibility
func NewLogBuffer() *EventBuffer {
	return NewEventBuffer()
}
