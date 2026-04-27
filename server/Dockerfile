# Build stage
FROM golang:1.26-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata && \
    update-ca-certificates

# Set working directory
WORKDIR /app

# Copy go mod files first for better layer caching
COPY go.mod go.sum ./
RUN go mod tidy

# Copy the entire source code
COPY . .

# Build the application
# - CGO_ENABLED=0 creates a statically linked binary
# - GOOS=linux ensures compatibility with Alpine/scratch
# - -ldflags="-w -s" strips debug information to reduce size
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o /app/bin/brimble-server \
    .  # Adjust this path to your main package

# Final minimal stage
FROM scratch

# Import CA certificates for HTTPS/TLS support
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the binary
COPY --from=builder /app/bin/brimble-server /brimble-server

# Expose the port your app runs on (adjust if different)
EXPOSE 3333

# Run the binary
ENTRYPOINT ["/brimble-server"]







































CMD ["./bin/main"]
