#!/bin/sh
set -e

if [ -n "${DATABASE_URL}" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
fi

echo "Starting backend on port ${PORT:-5000}..."
exec npx tsx src/server.ts
