.PHONY: help docker-up docker-down docker-build docker-logs docker-clean test

help:
	@echo "TrackFinance - Makefile Commands"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make docker-up       - Start all services (frontend, backend, database)"
	@echo "  make docker-down     - Stop all services"
	@echo "  make docker-build    - Rebuild all services"
	@echo "  make docker-logs     - Show logs from all services"
	@echo "  make docker-clean    - Stop services and remove volumes"
	@echo ""
	@echo "Development Commands:"
	@echo "  make test            - Run backend tests"
	@echo "  make seed            - Seed database with initial data"
	@echo ""

# Docker commands
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose up -d --build

docker-logs:
	docker-compose logs -f

docker-clean:
	docker-compose down -v
	docker system prune -f

# Development commands
test:
	cd backend && pytest -v

seed:
	docker-compose exec backend python -m app.scripts.seed_achievements

# Quick start for first-time setup
setup:
	@echo "Setting up TrackFinance..."
	docker-compose up -d --build
	@echo "Waiting for services to start..."
	sleep 10
	docker-compose exec backend python -m app.scripts.seed_achievements
	@echo ""
	@echo "✅ Setup complete!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000/docs"
