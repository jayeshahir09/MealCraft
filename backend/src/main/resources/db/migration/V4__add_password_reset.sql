-- V4: Add type and reset_token columns to email_otps for secure password reset flow

ALTER TABLE email_otps ADD COLUMN type VARCHAR(32) NOT NULL DEFAULT 'REGISTRATION';
ALTER TABLE email_otps ADD COLUMN reset_token_hash VARCHAR(255);
ALTER TABLE email_otps ADD COLUMN reset_token_expires_at TIMESTAMP(6);

CREATE INDEX idx_email_otps_email_type ON email_otps(email, type);
CREATE INDEX idx_email_otps_reset_token ON email_otps(reset_token_hash);

