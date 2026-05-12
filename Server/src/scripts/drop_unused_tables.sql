-- Drops tables for the 11 Sequelize models removed from the codebase.
-- CASCADE handles any orphan FK constraints from other tables.
-- Run once against the production/dev DB after deploying the model removal.

BEGIN;

DROP TABLE IF EXISTS "answers"        CASCADE;
DROP TABLE IF EXISTS "quiz_attempts"  CASCADE;
DROP TABLE IF EXISTS "questions"      CASCADE;
DROP TABLE IF EXISTS "quizzes"        CASCADE;
DROP TABLE IF EXISTS "resources"      CASCADE;
DROP TABLE IF EXISTS "code_sessions"  CASCADE;
DROP TABLE IF EXISTS "activity_logs"  CASCADE;
DROP TABLE IF EXISTS "progress"       CASCADE;
DROP TABLE IF EXISTS "chat_messages"  CASCADE;
DROP TABLE IF EXISTS "class_modules"  CASCADE;
DROP TABLE IF EXISTS "profiles"       CASCADE;

COMMIT;
