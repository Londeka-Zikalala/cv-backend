CREATE TABLE requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  package_type TEXT NOT NULL,
  description TEXT,
  filename TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);