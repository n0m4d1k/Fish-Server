#!/bin/bash

# Define directories and file patterns
LOG_DIR="/root/site-cloner/fakepal/log"
COMPRESSED_DIR="/root/site-cloner/fakepal/log/compressed"
TIMESTAMP=$(date +%Y-%m-%d)

# Ensure the compressed log directory exists
mkdir -p "$COMPRESSED_DIR"

# Compress today's logs
for file in "$LOG_DIR"/*.txt; do
    if [ -f "$file" ]; then
        gzip -c "$file" > "$COMPRESSED_DIR/$(basename "$file" .txt)-$TIMESTAMP.gz"
        echo "Compressed $file to $COMPRESSED_DIR/$(basename "$file" .txt)-$TIMESTAMP.gz"
        # Clear the original log file
        > "$file"
    fi
done

# Remove compressed logs older than 7 days
find "$COMPRESSED_DIR" -type f -name "*.gz" -mtime +7 -exec rm {} \;
echo "Deleted logs older than 7 days"
