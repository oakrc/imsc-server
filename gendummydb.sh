#!/usr/bin/env bash
set -euo pipefail

rm -f database.db
cat "$(git root)/db/schema.sql" "$(git root)/db/dummy.sql" | sqlite3 database.db
