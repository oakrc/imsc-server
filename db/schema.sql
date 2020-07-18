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
    report          TEXT NOT NULL,
    score           INT NOT NULL,
    last_scored     DATETIME,
    stopped         BOOLEAN NOT NULL,   -- True: user manually stopped scoring
    FOREIGN KEY (image_id) REFERENCES images(id) ON UPDATE CASCADE ON DELETE CASCADE
);

