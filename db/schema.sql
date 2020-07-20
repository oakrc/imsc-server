CREATE TABLE images (
    id              CHAR(36) PRIMARY KEY,
    image_name      TEXT NOT NULL,
    duration        INT NOT NULL
);

CREATE TABLE rules (
    id              CHAR(36) PRIMARY KEY,
    image_id        INT NOT NULL,
    rule_name       TEXT NOT NULL,
    points          INT NOT NULL,
    command         TEXT NOT NULL,
    exit_code       INT NOT NULL,
    FOREIGN KEY (image_id) REFERENCES images(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE sessions (
    token           CHAR(36) PRIMARY KEY,
    image_id        INT NOT NULL,
    user_name       TEXT NOT NULL,      -- name of the participant
    start_time      DATETIME NOT NULL,
    report          TEXT NOT NULL DEFAULT '{"pts":0,"vulns":[],"penalties":[]}',
    score           INT NOT NULL DEFAULT 0,
    last_scored     DATETIME DEFAULT '0001-01-01',
    stopped         BOOLEAN NOT NULL DEFAULT 0,   -- True: user manually stopped scoring
    FOREIGN KEY (image_id) REFERENCES images(id) ON UPDATE CASCADE ON DELETE CASCADE
);

