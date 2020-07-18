#!/bin/bash
rm database.db
cat db/schema.sql | sqlite3 database.db
