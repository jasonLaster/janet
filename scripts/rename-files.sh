#!/bin/bash


# Load environment variables directly
set -a
source ~/.zshrc
source "$(dirname "$0")/.env"
set +a


bun --version


bun ~/src/projects/PDF-OCR/rename.ts >> ~/src/projects/PDF-OCR/output.log 2>&1
TEST_EXIT_CODE=$?

# Send a notification based on the test result
if [ $TEST_EXIT_CODE -eq 0 ]; then
    # osascript -e 'display notification "Renaming passed. "PDF OCD"'
else
    osascript -e 'display notification "Renaming failed. Check ~/src/projects/PDF-OCR/output.log" with title "PDF OCD"'
fi 

