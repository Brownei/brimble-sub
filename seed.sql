-- Brimble Platform Database Seed Data
-- This file is automatically loaded when PostgreSQL starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sample deployment data
INSERT INTO deployments (uuid, name, git_url, branch, status, image_tag, live_url, port, error, created_at, updated_at, completed_at)
VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440000',
        'api-gateway',
        'https://github.com/example/api-gateway.git',
        'main',
        'running',
        'api-gateway:20240101120000',
        'http://api-gateway.localhost',
        8081,
        NULL,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '1 hour'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'auth-service',
        'https://github.com/example/auth-service.git',
        'main',
        'running',
        'auth-service:20240101123000',
        'http://auth-service.localhost',
        8082,
        NULL,
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440002',
        'frontend-app',
        'https://github.com/example/frontend-app.git',
        'develop',
        'failed',
        'frontend-app:20240101130000',
        NULL,
        8083,
        'npm ERR! code E404 npm ERR! 404 Not Found - GET https://registry.npmjs.org/dependency',
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '3 hours'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440003',
        'payment-processor',
        NULL,
        'main',
        'building',
        'payment-processor:20240101140000',
        NULL,
        8084,
        NULL,
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '30 minutes',
        NULL
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        'notification-worker',
        'https://github.com/example/notification-worker.git',
        'main',
        'pending',
        'notification-worker:20240101145000',
        NULL,
        8085,
        NULL,
        NOW() - INTERVAL '5 minutes',
        NOW() - INTERVAL '5 minutes',
        NULL
    );

-- Sample log entries for the first deployment (api-gateway)
INSERT INTO log_entries (deployment_id, message, stream, timestamp, created_at, updated_at)
SELECT 
    d.id,
    msg.message,
    msg.stream,
    msg.timestamp,
    msg.timestamp,
    msg.timestamp
FROM deployments d
CROSS JOIN LATERAL (VALUES
    (d.created_at + INTERVAL '1 minute', 'Starting deployment process...', 'stdout'),
    (d.created_at + INTERVAL '2 minutes', 'Downloading repository from: https://github.com/example/api-gateway.git (branch: main)', 'stdout'),
    (d.created_at + INTERVAL '3 minutes', 'Repository downloaded successfully', 'stdout'),
    (d.created_at + INTERVAL '4 minutes', 'Building Docker image: api-gateway:20240101120000', 'stdout'),
    (d.created_at + INTERVAL '5 minutes', 'Step 1/10 : FROM node:18-alpine', 'stdout'),
    (d.created_at + INTERVAL '6 minutes', 'Step 2/10 : WORKDIR /app', 'stdout'),
    (d.created_at + INTERVAL '7 minutes', 'Step 3/10 : COPY package*.json ./', 'stdout'),
    (d.created_at + INTERVAL '8 minutes', 'Step 4/10 : RUN npm ci --only=production', 'stdout'),
    (d.created_at + INTERVAL '9 minutes', 'added 127 packages in 3.2s', 'stdout'),
    (d.created_at + INTERVAL '10 minutes', 'Step 5/10 : COPY . .', 'stdout'),
    (d.created_at + INTERVAL '11 minutes', 'Step 6/10 : RUN npm run build', 'stdout'),
    (d.created_at + INTERVAL '12 minutes', 'Building for production...', 'stdout'),
    (d.created_at + INTERVAL '13 minutes', '✓ 42 modules transformed.', 'stdout'),
    (d.created_at + INTERVAL '14 minutes', 'dist/                     0.05 kB │ gzip: 0.07 kB', 'stdout'),
    (d.created_at + INTERVAL '15 minutes', 'Successfully built api-gateway:20240101120000', 'stdout'),
    (d.completed_at, 'Docker image built successfully', 'stdout'),
    (d.completed_at + INTERVAL '1 minute', 'Deploying container on port 8081', 'stdout'),
    (d.completed_at + INTERVAL '2 minutes', 'Container deployed successfully', 'stdout'),
    (d.completed_at + INTERVAL '3 minutes', 'Deployment completed! Live URL: http://api-gateway.localhost', 'stdout')
) AS msg(timestamp, message, stream)
WHERE d.name = 'api-gateway';

-- Sample log entries for the failed deployment (frontend-app)
INSERT INTO log_entries (deployment_id, message, stream, timestamp, created_at, updated_at)
SELECT 
    d.id,
    msg.message,
    msg.stream,
    msg.timestamp,
    msg.timestamp,
    msg.timestamp
FROM deployments d
CROSS JOIN LATERAL (VALUES
    (d.created_at + INTERVAL '1 minute', 'Starting deployment process...', 'stdout'),
    (d.created_at + INTERVAL '2 minutes', 'Downloading repository from: https://github.com/example/frontend-app.git (branch: develop)', 'stdout'),
    (d.created_at + INTERVAL '3 minutes', 'Repository downloaded successfully', 'stdout'),
    (d.created_at + INTERVAL '4 minutes', 'Building Docker image: frontend-app:20240101130000', 'stdout'),
    (d.created_at + INTERVAL '5 minutes', 'Step 1/8 : FROM node:18-alpine', 'stdout'),
    (d.created_at + INTERVAL '6 minutes', 'Step 2/8 : WORKDIR /app', 'stdout'),
    (d.created_at + INTERVAL '7 minutes', 'Step 3/8 : COPY package*.json ./', 'stdout'),
    (d.created_at + INTERVAL '8 minutes', 'Step 4/8 : RUN npm ci', 'stdout'),
    (d.created_at + INTERVAL '9 minutes', 'npm ERR! code E404', 'stderr'),
    (d.created_at + INTERVAL '10 minutes', 'npm ERR! 404 Not Found - GET https://registry.npmjs.org/dependency', 'stderr'),
    (d.completed_at, 'ERROR: Docker build failed: npm ERR! code E404', 'stderr')
) AS msg(timestamp, message, stream)
WHERE d.name = 'frontend-app';
