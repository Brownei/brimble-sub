package internal

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

func SlogMiddleware(logger *slog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Create a response writer wrapper to capture status code
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			// Process request
			defer func() {
				// Log after request completes
				duration := time.Since(start)

				// Get request ID if set by middleware
				requestID := middleware.GetReqID(r.Context())

				// Create log attributes
				attrs := []slog.Attr{
					slog.String("method", r.Method),
					slog.String("path", r.URL.Path),
					slog.Int("status", ww.Status()),
					slog.Duration("duration", duration),
					slog.String("remote_addr", r.RemoteAddr),
					slog.String("user_agent", r.UserAgent()),
					slog.Int("bytes", ww.BytesWritten()),
				}

				if requestID != "" {
					attrs = append(attrs, slog.String("request_id", requestID))
				}

				// Choose log level based on status code
				msg := "Request completed"
				if ww.Status() >= 500 {
					logger.Error(msg, attrsToArgs(attrs)...)
				} else if ww.Status() >= 400 {
					logger.Warn(msg, attrsToArgs(attrs)...)
				} else {
					logger.Info(msg, attrsToArgs(attrs)...)
				}
			}()

			next.ServeHTTP(ww, r)
		})
	}
}

func attrsToArgs(attrs []slog.Attr) []any {
	args := make([]any, 0, len(attrs)*2)
	for _, attr := range attrs {
		args = append(args, attr.Key, attr.Value.Any())
	}
	return args
}
