#!/bin/sh
set -e

# Validate APP_NAME to prevent injection
case "$APP_NAME" in
  "default"|"sanden"|"fasthelp")
    # Valid app names
    ;;
  *)
    echo "Invalid APP_NAME: $APP_NAME. Must be one of: default, sanden, fasthelp"
    exit 1
    ;;
esac

# Set Mastra server URL based on validated app name
case "$APP_NAME" in
  "default")
    export MASTRA_SERVER_URL="http://localhost:4000"
    ;;
  "sanden")
    export MASTRA_SERVER_URL="http://localhost:4001"
    ;;
  "fasthelp")
    export MASTRA_SERVER_URL="http://localhost:4002"
    ;;
esac

echo "Starting with MASTRA_SERVER_URL=$MASTRA_SERVER_URL"
exec node server.js
