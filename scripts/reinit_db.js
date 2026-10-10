const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'premed_portal.sqlite');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new DatabaseSync(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  matric_no TEXT NOT NULL UNIQUE,
  phone TEXT,
  password TEXT NOT NULL,
  department TEXT NOT NULL,
  strength TEXT NOT NULL DEFAULT 'General',
  session_token_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_matric ON students(matric_no);
CREATE INDEX IF NOT EXISTS idx_student_dept ON students(department);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  icon TEXT DEFAULT 'Book',
  scheduled_date TEXT,
  end_date TEXT,
  is_mock INTEGER DEFAULT 1,
  is_master INTEGER DEFAULT 0,
  is_locked INTEGER DEFAULT 0,
  results_hidden INTEGER DEFAULT 0,
  results_locked INTEGER DEFAULT 0,
  force_start INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 30,
  question_limit INTEGER DEFAULT 20,
  attempts_allowed INTEGER DEFAULT 1,
  question_timer_limit INTEGER DEFAULT 0,
  multicourse_config TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,
  question_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_topic_course ON topics(course_id);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  text TEXT NOT NULL,
  a TEXT NOT NULL,
  b TEXT NOT NULL,
  c TEXT,
  d TEXT,
  correct_option TEXT NOT NULL,
  diagram_url TEXT,
  explanation TEXT,
  is_refined INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_question_topic ON questions(topic_id);

CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  parent_course_id TEXT,
  attempt_id TEXT,
  device_id TEXT,
  total_score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage REAL NOT NULL,
  grade TEXT NOT NULL,
  question_ids TEXT,
  topic_breakdown TEXT,
  student_answers TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_result_student ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_result_course ON results(course_id);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_name TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);
`);

const starterCourses = [
  { id: 'med_cbt_101', code: 'MED 101', title: 'Comprehensive Medical Sciences', icon: 'Stethoscope' },
  { id: 'den_cbt_101', code: 'DEN 101', title: 'Dental Sciences & Oral Anatomy', icon: 'Smile' },
  { id: 'pt_cbt_101', code: 'PTH 101', title: 'Physiotherapy & Rehabilitation', icon: 'Zap' },
  { id: 'ana_cbt_101', code: 'ANA 101', title: 'Human Anatomy & Histology', icon: 'Activity' },
  { id: 'phs_cbt_101', code: 'PHS 101', title: 'Systemic Human Physiology', icon: 'HeartPulse' }
];

const insertCourse = db.prepare(`
  INSERT INTO courses (id, code, title, icon, is_mock, is_locked, duration, question_limit)
  VALUES (?, ?, ?, ?, 1, 0, 30, 20)
`);

for (const c of starterCourses) {
  insertCourse.run(c.id, c.code, c.title, c.icon);
}

// Add a fresh welcome announcement
const insertAnnounce = db.prepare(`
  INSERT INTO announcements (id, title, content, type)
  VALUES (?, ?, ?, ?)
`);
insertAnnounce.run('ann_welcome', 'Portal Upgraded & Fresh Academic Session', 'Welcome to the upgraded Premed CBT Assessment Portal. Students can now register across all medical departments including Physiotherapy and Dentistry.', 'info');

console.log('Database successfully reinitialized: 0 old students, 0 old results, 0 old questions. Fresh clean session ready!');
