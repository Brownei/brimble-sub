
export interface Deployment {
  id: string;
  name: string;
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed';
  url: string | null;
  imageTag: string | null;
  createdAt: string;
}

export const mockDeployments: Deployment[] = [
  {
    id: 'dep_1',
    name: 'frontend-app',
    status: 'running',
    url: 'https://frontend-app-prod.brimble.app',
    imageTag: 'registry.brimble.com/frontend-app:v1.2.3',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: 'dep_2',
    name: 'backend-api',
    status: 'deploying',
    url: null,
    imageTag: 'registry.brimble.com/backend-api:v2.0.1',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
  },
  {
    id: 'dep_3',
    name: 'auth-service',
    status: 'building',
    url: null,
    imageTag: 'registry.brimble.com/auth-service:v1.0.5',
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 mins ago
  },
  {
    id: 'dep_4',
    name: 'marketing-site',
    status: 'failed',
    url: null,
    imageTag: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
  },
  {
    id: 'dep_5',
    name: 'internal-dashboard',
    status: 'pending',
    url: null,
    imageTag: null,
    createdAt: new Date(Date.now() - 1000 * 30).toISOString(), // 30 secs ago
  }
];

export const mockLogStream = [
  "Cloning repository...",
  "Installing dependencies...",
  "Running build script...",
  "Building docker image...",
  "Step 1/5 : FROM node:18-alpine",
  "Step 2/5 : WORKDIR /app",
  "Step 3/5 : COPY package*.json ./",
  "Step 4/5 : RUN npm ci",
  "Step 5/5 : COPY . .",
  "Successfully built image",
  "Pushing to registry...",
  "Deploying to cluster...",
  "Waiting for pods to be ready...",
  "Deployment successful! App is now running."
];
