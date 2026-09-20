CREATE TABLE IF NOT EXISTS institutions (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'campus',
  logo_url text,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  student_instructions text NOT NULL DEFAULT '',
  retention_days integer NOT NULL DEFAULT 365,
  show_student_identities boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  assessment_engine text NOT NULL DEFAULT 'heuristic',
  assessment_model text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE institutions ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS assessment_engine text NOT NULL DEFAULT 'heuristic';
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS assessment_model text NOT NULL DEFAULT '';
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS institution_users (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'admin',
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, email)
);

ALTER TABLE institution_users ALTER COLUMN password_hash SET DEFAULT '';
ALTER TABLE institution_users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_global ON institution_users (lower(email));
CREATE INDEX IF NOT EXISTS idx_institutions_active ON institutions (active);
CREATE INDEX IF NOT EXISTS idx_institution_users_active ON institution_users (active);

CREATE TABLE IF NOT EXISTS assessment_profiles (
  id text PRIMARY KEY,
  institution_id text REFERENCES institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  dimensions jsonb NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  institution_id text NOT NULL UNIQUE REFERENCES institutions(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter',
  annual_limit integer NOT NULL DEFAULT 250,
  assessments_used integer NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  renewal_date date NOT NULL
);

CREATE TABLE IF NOT EXISTS usage (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  assessments_used integer NOT NULL DEFAULT 0,
  UNIQUE (institution_id, period_start)
);

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  public_slug text NOT NULL UNIQUE,
  public_code text NOT NULL UNIQUE,
  instructions text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  email text,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cv_documents (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE SET NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  byte_size integer NOT NULL DEFAULT 0,
  content_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessments (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE SET NULL,
  event_id text REFERENCES events(id) ON DELETE SET NULL,
  document_id text REFERENCES cv_documents(id) ON DELETE SET NULL,
  profile_id text REFERENCES assessment_profiles(id) ON DELETE SET NULL,
  access_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'queued',
  overall_score integer,
  summary text NOT NULL DEFAULT '',
  engine text NOT NULL DEFAULT 'heuristic',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS cv_analysis (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  assessment_id text NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
  extracted_text text NOT NULL DEFAULT '',
  structured jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS assessment_dimensions (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  assessment_id text NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  dimension text NOT NULL,
  score integer NOT NULL,
  status text NOT NULL,
  evidence text NOT NULL DEFAULT '',
  UNIQUE (assessment_id, dimension)
);

CREATE TABLE IF NOT EXISTS recommendations (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  assessment_id text NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  priority text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  dimension text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_institution ON institution_users(institution_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON institution_users(email);
CREATE INDEX IF NOT EXISTS idx_students_institution ON students(institution_id);
CREATE INDEX IF NOT EXISTS idx_events_institution ON events(institution_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(public_slug);
CREATE INDEX IF NOT EXISTS idx_assessments_institution ON assessments(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_event ON assessments(event_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_dimensions_assessment ON assessment_dimensions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_assessment ON recommendations(assessment_id);
CREATE INDEX IF NOT EXISTS idx_usage_institution ON usage(institution_id, period_start);

CREATE TABLE IF NOT EXISTS goals (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  goal_code text NOT NULL,
  title text NOT NULL,
  context_text text NOT NULL DEFAULT '',
  focus_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  public_slug text NOT NULL UNIQUE,
  public_code text NOT NULL UNIQUE,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_institution ON goals(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_slug ON goals(public_slug);

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS goal_id text REFERENCES goals(id) ON DELETE SET NULL;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS candidate_name text NOT NULL DEFAULT '';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS ranking jsonb;
CREATE INDEX IF NOT EXISTS idx_assessments_goal ON assessments(goal_id);

CREATE TABLE IF NOT EXISTS candidates (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  candidate_code text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  linkedin_url text,
  github_url text,
  degree text,
  college text,
  profile_summary text,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  companies jsonb NOT NULL DEFAULT '[]'::jsonb,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  years_experience integer NOT NULL DEFAULT 0,
  cv_file_name text,
  document_id text REFERENCES cv_documents(id) ON DELETE SET NULL,
  content_hash text,
  last_score integer,
  last_recommendation text,
  last_ranked_at timestamptz,
  directory_status text NOT NULL DEFAULT 'On campus',
  archived boolean NOT NULL DEFAULT false,
  student_id text REFERENCES students(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidates_institution ON candidates(institution_id, archived, last_ranked_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_email
  ON candidates (institution_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_hash
  ON candidates (institution_id, content_hash)
  WHERE content_hash IS NOT NULL AND content_hash <> '';

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS candidate_id text REFERENCES candidates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_assessments_candidate ON assessments(candidate_id);

ALTER TABLE goals ADD COLUMN IF NOT EXISTS context_file_name text;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS context_mime_type text;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS context_storage_path text;

CREATE TABLE IF NOT EXISTS cv_shares (
  id text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  assessment_id text NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cv_shares_assessment ON cv_shares(assessment_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cv_shares_token ON cv_shares(share_token);

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS prompt_tokens integer NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS completion_tokens integer NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS ai_cost_usd numeric(12, 6) NOT NULL DEFAULT 0;

