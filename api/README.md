# Consensus Service

A backend service where a group of LLMs is prompted with a task and they work on solving it together until they reach a consensus.

## Features

- FastAPI backend for handling requests
- Multiple LLM agents collaborating on tasks
- Consensus mechanism to determine when agreement is reached
- Docker containerization for easy deployment

## Setup

### Prerequisites

- Docker and Docker Compose
- Python 3.9+

### Installation

1. Clone the repository
2. Build and run with Docker Compose:

```bash
docker-compose up --build
```

Or run locally:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## API Endpoints

- `POST /api/tasks`: Create a new task for LLMs to solve
- `GET /api/tasks/{task_id}`: Get the status and results of a task
- `GET /api/tasks`: List all tasks

## Architecture

The service uses a multi-agent approach where several LLM instances work on the same problem. Each agent proposes solutions, and the system determines when consensus has been reached based on similarity or agreement between solutions.
