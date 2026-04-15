#!/bin/bash
# Deploy DBX CRUDs to Databricks
# Usage: ./deploy.sh <profile> <email>
# Example: ./deploy.sh e2-demo-west juliandro.figueiro@databricks.com

PROFILE=${1:-e2-demo-west}
EMAIL=${2:-juliandro.figueiro@databricks.com}

echo "Deploying to profile: $PROFILE"
echo "Workspace path: /Users/$EMAIL/dbx-cruds"

# Sync files (excluding app.yaml which has credentials in workspace)
databricks sync . /Users/$EMAIL/dbx-cruds \
  --exclude node_modules \
  --exclude .venv \
  --exclude __pycache__ \
  --exclude .git \
  --exclude "frontend/src" \
  --exclude "frontend/public" \
  --exclude "frontend/node_modules" \
  --exclude app.yaml \
  --exclude "*.sh" \
  --profile $PROFILE

echo "Files synced. Deploying app..."

databricks apps deploy dbx-cruds \
  --source-code-path /Workspace/Users/$EMAIL/dbx-cruds \
  --profile $PROFILE

echo "Done!"
