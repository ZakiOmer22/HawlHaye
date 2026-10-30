-- ── TASK RULES ────────────────────────────────────────────────
ALTER TABLE tasks
  ADD CONSTRAINT tasks_title_len CHECK (char_length(title) BETWEEN 3 AND 200),
  ADD CONSTRAINT tasks_description_len CHECK (description IS NULL OR char_length(description) <= 5000),
  ADD CONSTRAINT tasks_blocked_reason CHECK (status <> 'BLOCKED' OR ("blockedReason" IS NOT NULL AND char_length("blockedReason") >= 3)),
  ADD CONSTRAINT tasks_assigned_needs_owner_due CHECK (status = 'UNASSIGNED' OR ("ownerId" IS NOT NULL AND "dueDate" IS NOT NULL)),
  ADD CONSTRAINT tasks_completed_at CHECK ((status = 'COMPLETED') = ("completedAt" IS NOT NULL)),
  ADD CONSTRAINT tasks_cancel_pair CHECK (("cancelledAt" IS NULL) = ("cancelReason" IS NULL));

-- ── OTHER TABLE CONSTRAINTS ───────────────────────────────────
ALTER TABLE delegations ADD CONSTRAINT delegations_responded CHECK (status NOT IN ('ACCEPTED','DECLINED') OR "respondedAt" IS NOT NULL);
CREATE UNIQUE INDEX delegations_one_active_per_task ON delegations ("taskId") WHERE "endedAt" IS NULL AND status IN ('PENDING','ACCEPTED');

ALTER TABLE users ADD CONSTRAINT users_email_lower CHECK (email = lower(email));
ALTER TABLE invites ADD CONSTRAINT invites_email_lower CHECK (email = lower(email));
CREATE UNIQUE INDEX invites_one_open_per_email ON invites (email) WHERE "acceptedAt" IS NULL AND "revokedAt" IS NULL;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_size CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 10485760),
  ADD CONSTRAINT attachments_name_len CHECK (char_length("fileName") BETWEEN 1 AND 255);

ALTER TABLE comments ADD CONSTRAINT comments_body_len CHECK (char_length(body) BETWEEN 1 AND 5000);
ALTER TABLE sessions ADD CONSTRAINT sessions_expiry CHECK ("expiresAt" > "createdAt");

-- ── APPEND-ONLY HISTORY ───────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: append-only table', TG_OP, TG_TABLE_NAME USING ERRCODE = 'integrity_constraint_violation';
END; $$;

CREATE TRIGGER task_events_append_only BEFORE UPDATE OR DELETE ON task_events FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER task_events_no_truncate BEFORE TRUNCATE ON task_events FOR EACH STATEMENT EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER audit_logs_no_truncate BEFORE TRUNCATE ON audit_logs FOR EACH STATEMENT EXECUTE FUNCTION prevent_mutation();

-- ── SAFE TASK-CODE GENERATOR ──────────────────────────────────
CREATE OR REPLACE FUNCTION next_task_seq(p_year integer) RETURNS integer
LANGUAGE sql AS $$
  INSERT INTO task_code_sequences (year, "lastSeq", "updatedAt")
  VALUES (p_year, 1, now())
  ON CONFLICT (year) DO UPDATE
    SET "lastSeq" = task_code_sequences."lastSeq" + 1, "updatedAt" = now()
  RETURNING "lastSeq";
$$;
