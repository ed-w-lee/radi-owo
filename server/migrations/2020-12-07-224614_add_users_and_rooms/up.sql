-- Your SQL goes here
CREATE TABLE users (
  id           uuid         NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL,
  pass_hash    BYTEA        NOT NULL,
  salt         BYTEA        NOT NULL,
  PRIMARY KEY(id),
  UNIQUE(email),
  UNIQUE(display_name)
);

CREATE TABLE rooms (
  id             uuid         NOT NULL,
  user_id        uuid         NOT NULL,
  room_name      VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL,
  last_connected TIMESTAMPTZ,
  PRIMARY KEY(id),
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
      REFERENCES users(id)
      ON DELETE CASCADE
);