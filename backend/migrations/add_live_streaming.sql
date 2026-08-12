-- ============================================================
-- Migration: add_live_streaming.sql
-- Step 2: Database schema for live streaming feature
-- Run this ONCE against your MySQL database
-- ============================================================

-- 1. Add is_teacher boolean to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_teacher BOOLEAN NOT NULL DEFAULT FALSE
  COMMENT 'Whether this user can broadcast live sessions';

-- 2. Create live_sessions table
CREATE TABLE IF NOT EXISTS live_sessions (
  id              VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  host_id         INT          NOT NULL,
  title           VARCHAR(255) NOT NULL,
  status          ENUM('scheduled', 'live', 'ended') NOT NULL DEFAULT 'scheduled',
  started_at      DATETIME     NULL,
  ended_at        DATETIME     NULL,
  recording_path  VARCHAR(500) NULL COMMENT 'Hetzner path to the HLS recording after the session ends',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_live_sessions_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create live_session_subjects junction table (many-to-many: session ↔ subjects)
CREATE TABLE IF NOT EXISTS live_session_subjects (
  id          INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id  VARCHAR(36) NOT NULL,
  subject_id  INT         NOT NULL,
  CONSTRAINT fk_lss_session  FOREIGN KEY (session_id) REFERENCES live_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_lss_subject  FOREIGN KEY (subject_id) REFERENCES subjects(id)      ON DELETE CASCADE,
  UNIQUE KEY uq_session_subject (session_id, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Index for fast status lookups
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host   ON live_sessions(host_id);

SELECT 'Live streaming migration completed successfully.' AS result;
