-- ============================================================
--  StudySprint — Supabase Schema
--  Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. profiles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT        NOT NULL DEFAULT '',
  school        TEXT        NOT NULL DEFAULT '',
  xp            INTEGER     NOT NULL DEFAULT 0,
  level         INTEGER     NOT NULL DEFAULT 1,
  streak        INTEGER     NOT NULL DEFAULT 0,
  last_active   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── 2. tasks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  priority    TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent','medium','low')),
  subject     TEXT        NOT NULL DEFAULT 'General',
  due_date    DATE,
  done        BOOLEAN     NOT NULL DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  steps       JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id);

-- ── 3. roadmaps ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roadmaps (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal          TEXT        NOT NULL,
  level         TEXT,
  hours_per_week INTEGER,
  deadline      TEXT,
  phases        JSONB       NOT NULL DEFAULT '[]',
  stage_progress JSONB      NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own roadmaps"
  ON public.roadmaps FOR ALL
  USING (auth.uid() = user_id);

-- ── 4. xp_history ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.xp_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      INTEGER     NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own xp_history"
  ON public.xp_history FOR ALL
  USING (auth.uid() = user_id);

-- ── 5. streak_log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.streak_log (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE  NOT NULL,
  UNIQUE (user_id, date)
);

ALTER TABLE public.streak_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own streak_log"
  ON public.streak_log FOR ALL
  USING (auth.uid() = user_id);

-- ── 6. Trigger: auto-create profile after signup ─────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, school)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'school', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 7. Trigger: stamp done_at when task is completed ─────────
CREATE OR REPLACE FUNCTION public.handle_task_done()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.done = TRUE AND OLD.done = FALSE THEN
    NEW.done_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_completed ON public.tasks;
CREATE TRIGGER on_task_completed
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_done();
