#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Load environment variables if .env exists
if [ -f .env ]; then
    source .env
fi

# Run the script
/usr/local/bin/bun run rename.ts >> "$PROJECT_DIR/output/rename-$(date +\%Y-\%m-\%d).log" 2>&1 