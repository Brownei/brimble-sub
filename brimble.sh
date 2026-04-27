#!/bin/bash

# Brimble Platform - Build and Run Script
# This script helps build and run the complete Brimble deployment platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if required tools are installed
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    
    check_docker
    print_success "All prerequisites met"
}

# Function to create .env file if it doesn't exist
create_env_file() {
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        print_info "Creating .env file from .env.example..."
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        print_warning "Please review and update .env file with your settings"
    fi
}

# Function to add hosts entries
setup_hosts() {
    print_info "Checking /etc/hosts entries..."
    
    if ! grep -q "api.localhost" /etc/hosts; then
        print_warning "Adding api.localhost to /etc/hosts (requires sudo)"
        echo "127.0.0.1 api.localhost localhost" | sudo tee -a /etc/hosts > /dev/null
        print_success "Hosts entries added"
    else
        print_success "Hosts entries already configured"
    fi
}

# Function to build all services
build_all() {
    print_info "Building all services..."
    cd "$PROJECT_ROOT"
    docker-compose build --no-cache
    print_success "All services built successfully"
}

# Function to build specific service
build_service() {
    local service=$1
    print_info "Building $service..."
    cd "$PROJECT_ROOT"
    docker-compose build --no-cache $service
    print_success "$service built successfully"
}

# Function to start all services
start_all() {
    print_info "Starting all services..."
    cd "$PROJECT_ROOT"
    docker-compose up -d
    print_success "All services started"
    
    print_info "Waiting for services to be ready..."
    sleep 5
    
    # Check if services are healthy
    docker-compose ps
    
    print_success "Brimble platform is ready!"
    echo ""
    echo -e "${GREEN}Access the platform:${NC}"
    echo -e "  🌐 Web UI:     http://localhost"
    echo -e "  🔌 API:        http://api.localhost"
    echo -e "  📊 Logs:       docker-compose logs -f"
    echo ""
}

# Function to start specific service
start_service() {
    local service=$1
    print_info "Starting $service..."
    cd "$PROJECT_ROOT"
    docker-compose up -d $service
    print_success "$service started"
}

# Function to stop all services
stop_all() {
    print_info "Stopping all services..."
    cd "$PROJECT_ROOT"
    docker-compose down
    print_success "All services stopped"
}

# Function to stop specific service
stop_service() {
    local service=$1
    print_info "Stopping $service..."
    cd "$PROJECT_ROOT"
    docker-compose stop $service
    print_success "$service stopped"
}

# Function to view logs
view_logs() {
    local service=$1
    if [ -z "$service" ]; then
        print_info "Showing logs for all services..."
        cd "$PROJECT_ROOT"
        docker-compose logs -f
    else
        print_info "Showing logs for $service..."
        cd "$PROJECT_ROOT"
        docker-compose logs -f $service
    fi
}

# Function to reset everything (WARNING: removes data)
reset_all() {
    print_warning "This will remove all containers, volumes, and data!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Removing all containers and volumes..."
        cd "$PROJECT_ROOT"
        docker-compose down -v --remove-orphans
        print_success "All containers and volumes removed"
    else
        print_info "Reset cancelled"
    fi
}

# Function to show status
show_status() {
    print_info "Showing service status..."
    cd "$PROJECT_ROOT"
    docker-compose ps
}

# Function to install Railpack CLI
install_railpack() {
    print_info "Installing Railpack CLI..."
    
    # Check if already installed
    if command -v railpack &> /dev/null; then
        print_success "Railpack is already installed"
        railpack --version
        return
    fi
    
    # Install based on OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://railpack.dev/install.sh | sh
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install railwayapp/tap/railpack
    else
        print_error "Unsupported OS. Please install Railpack manually from https://railpack.dev"
        exit 1
    fi
    
    print_success "Railpack installed successfully"
}

# Function to build with Railpack
build_with_railpack() {
    print_info "Building with Railpack..."
    
    if ! command -v railpack &> /dev/null; then
        print_warning "Railpack not found. Installing..."
        install_railpack
    fi
    
    cd "$PROJECT_ROOT"
    
    print_info "Building server with Railpack..."
    cd server
    railpack build --tag brimble-server:latest
    
    print_info "Building client with Railpack..."
    cd ../client
    railpack build --tag brimble-client:latest
    
    cd "$PROJECT_ROOT"
    print_success "Railpack builds completed"
}

# Function to show help
show_help() {
    echo "Brimble Platform - Build and Run Script"
    echo ""
    echo "Usage: ./brimble.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup              Setup environment and prerequisites"
    echo "  build [service]    Build all services or specific service"
    echo "  start [service]    Start all services or specific service"
    echo "  stop [service]     Stop all services or specific service"
    echo "  restart [service]  Restart services"
    echo "  logs [service]     View logs for all or specific service"
    echo "  status             Show service status"
    echo "  reset              Reset everything (removes all data!)"
    echo "  railpack           Build using Railpack instead of Docker"
    echo "  install-railpack   Install Railpack CLI"
    echo "  help               Show this help message"
    echo ""
    echo "Services:"
    echo "  postgres           PostgreSQL database"
    echo "  server             Go backend API server"
    echo "  client             React frontend client"
    echo "  caddy              Caddy reverse proxy"
    echo ""
    echo "Examples:"
    echo "  ./brimble.sh setup              # Initial setup"
    echo "  ./brimble.sh build              # Build all services"
    echo "  ./brimble.sh start              # Start all services"
    echo "  ./brimble.sh logs server        # View server logs"
    echo "  ./brimble.sh restart server     # Restart server only"
    echo ""
}

# Main script logic
case "${1:-help}" in
    setup)
        check_prerequisites
        create_env_file
        setup_hosts
        print_success "Setup complete! You can now run: ./brimble.sh build && ./brimble.sh start"
        ;;
    build)
        check_prerequisites
        if [ -n "$2" ]; then
            build_service "$2"
        else
            build_all
        fi
        ;;
    start)
        check_prerequisites
        if [ -n "$2" ]; then
            start_service "$2"
        else
            start_all
        fi
        ;;
    stop)
        if [ -n "$2" ]; then
            stop_service "$2"
        else
            stop_all
        fi
        ;;
    restart)
        if [ -n "$2" ]; then
            stop_service "$2"
            sleep 2
            start_service "$2"
        else
            stop_all
            sleep 2
            start_all
        fi
        ;;
    logs)
        view_logs "$2"
        ;;
    status)
        show_status
        ;;
    reset)
        reset_all
        ;;
    railpack)
        build_with_railpack
        ;;
    install-railpack)
        install_railpack
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
