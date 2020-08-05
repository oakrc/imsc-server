#!/bin/bash
rm database.db
sqlite3 database.db < "$(git root)/db/schema.sql"
