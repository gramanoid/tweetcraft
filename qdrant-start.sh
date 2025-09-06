#!/bin/bash

# Qdrant Docker Management Script
# For RooCode codebase indexing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_message "$RED" "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_message "$RED" "Error: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Parse command line arguments
ACTION=${1:-start}

case $ACTION in
    start)
        print_message "$GREEN" "🚀 Starting Qdrant vector database..."
        docker-compose up -d
        
        # Wait for Qdrant to be ready
        print_message "$YELLOW" "⏳ Waiting for Qdrant to be ready..."
        sleep 3
        
        # Check if Qdrant is running
        if curl -s http://localhost:6333/readiness > /dev/null 2>&1; then
            print_message "$GREEN" "✅ Qdrant is ready at http://localhost:6333"
            print_message "$GREEN" "📊 Dashboard available at: http://localhost:6333/dashboard"
        else
            print_message "$YELLOW" "⚠️  Qdrant is starting up. Please wait a moment and check http://localhost:6333"
        fi
        ;;
        
    stop)
        print_message "$YELLOW" "🛑 Stopping Qdrant..."
        docker-compose down
        print_message "$GREEN" "✅ Qdrant stopped successfully"
        ;;
        
    restart)
        print_message "$YELLOW" "🔄 Restarting Qdrant..."
        docker-compose restart
        print_message "$GREEN" "✅ Qdrant restarted successfully"
        ;;
        
    status)
        if docker-compose ps | grep -q "qdrant.*Up"; then
            print_message "$GREEN" "✅ Qdrant is running"
            docker-compose ps
        else
            print_message "$RED" "❌ Qdrant is not running"
        fi
        ;;
        
    logs)
        print_message "$YELLOW" "📜 Showing Qdrant logs (Ctrl+C to exit)..."
        docker-compose logs -f qdrant
        ;;
        
    clean)
        print_message "$RED" "⚠️  This will delete all Qdrant data!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_message "$YELLOW" "🗑️  Cleaning Qdrant data..."
            docker-compose down -v
            rm -rf ./qdrant_storage
            print_message "$GREEN" "✅ Qdrant data cleaned"
        else
            print_message "$YELLOW" "❌ Clean operation cancelled"
        fi
        ;;
        
    *)
        print_message "$YELLOW" "Usage: ./qdrant-start.sh [start|stop|restart|status|logs|clean]"
        echo ""
        echo "Commands:"
        echo "  start    - Start Qdrant container"
        echo "  stop     - Stop Qdrant container"
        echo "  restart  - Restart Qdrant container"
        echo "  status   - Check if Qdrant is running"
        echo "  logs     - Show Qdrant logs"
        echo "  clean    - Stop Qdrant and delete all data (use with caution)"
        exit 1
        ;;
esac