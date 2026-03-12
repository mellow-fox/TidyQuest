#!/bin/sh
set -e

# Fix volume permissions (needed when host-mounted volume is owned by root)
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/data
  exec su-exec node "$@"
else
  exec "$@"
fi
