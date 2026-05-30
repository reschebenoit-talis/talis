-- ============================================================
-- TALIS — Schéma de base de données
-- Copiez-collez tout ce fichier dans Supabase > SQL Editor > New query
-- puis cliquez sur "Run"
-- ============================================================

-- Classes
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6C63FF',
  created_at timestamptz default now()
);

-- Élèves
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  password_hash text not null default 'talis2024',
  must_change_password boolean default true,
  class_id uuid references classes(id) on delete set null,
  progress integer default 0,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- Vidéos
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  section text,
  duration text,
  emoji text default '🎬',
  drive_url text,
  created_at timestamptz default now()
);

-- Vidéos ↔ Classes (relation many-to-many)
create table if not exists video_classes (
  video_id uuid references videos(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  primary key (video_id, class_id)
);

-- Fiches de révision
create table if not exists fiches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  section text,
  drive_url text,
  color text default '#6C63FF',
  created_at timestamptz default now()
);

-- Fiches ↔ Classes
create table if not exists fiche_classes (
  fiche_id uuid references fiches(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  primary key (fiche_id, class_id)
);

-- Quiz
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  pass_score integer default 80,
  created_at timestamptz default now()
);

-- Quiz ↔ Classes
create table if not exists quiz_classes (
  quiz_id uuid references quizzes(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  primary key (quiz_id, class_id)
);

-- Questions de quiz
create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  question text not null,
  choices jsonb not null,
  answer_index integer not null,
  position integer default 0
);

-- Résultats de quiz par élève
create table if not exists quiz_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  quiz_id uuid references quizzes(id) on delete cascade,
  score integer not null,
  completed_at timestamptz default now(),
  unique(student_id, quiz_id)
);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  from_role text not null check (from_role in ('teacher','student')),
  text text,
  attachments jsonb default '[]',
  sent_at timestamptz default now()
);

-- ============================================================
-- Données de démonstration (optionnel — supprimez si vous voulez repartir de zéro)
-- ============================================================

insert into classes (id, name, color) values
  ('11111111-1111-1111-1111-111111111111', 'Terminale A', '#6C63FF'),
  ('22222222-2222-2222-2222-222222222222', 'Terminale B', '#FF6584')
on conflict do nothing;

insert into students (first_name, last_name, email, password_hash, must_change_password, class_id, progress) values
  ('Emma',  'Dupont',  'emma@ecole.fr',  'talis2024', false, '11111111-1111-1111-1111-111111111111', 78),
  ('Lucas', 'Martin',  'lucas@ecole.fr', 'talis2024', false, '11111111-1111-1111-1111-111111111111', 45),
  ('Chloé', 'Bernard', 'chloe@ecole.fr', 'talis2024', false, '22222222-2222-2222-2222-222222222222', 92),
  ('Noah',  'Petit',   'noah@ecole.fr',  'talis2024', true,  '22222222-2222-2222-2222-222222222222', 31)
on conflict do nothing;
