const { DatabaseSync } = require('node:sqlite');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://premedtestportal:20252026@cluster0.jqcmhc6.mongodb.net/premedtestportal?retryWrites=true&w=majority&appName=Cluster0";

async function buildSqliteDatabase() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;

  console.log("Fetching collections from MongoDB...");
  const courses = await db.collection('courses').find({}).toArray();
  const topics = await db.collection('topics').find({}).toArray();
  const questions = await db.collection('questions').find({}).toArray();
  const students = await db.collection('students').find({}).toArray();
  const results = await db.collection('results').find({}).toArray();
  const settings = await db.collection('settings').find({}).toArray();

  console.log(`Fetched: ${courses.length} courses, ${topics.length} topics, ${questions.length} questions, ${students.length} students, ${results.length} results.`);

  const dbPath = path.resolve(__dirname, 'premed_portal.sqlite');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const sqlite = new DatabaseSync(dbPath);

  // Enable WAL mode for high performance
  sqlite.exec('PRAGMA journal_mode = WAL;');

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      icon TEXT DEFAULT 'Book',
      scheduled_date TEXT,
      end_date TEXT,
      is_mock INTEGER DEFAULT 1,
      is_master INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 1,
      results_hidden INTEGER DEFAULT 0,
      results_locked INTEGER DEFAULT 1,
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

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      matric_no TEXT NOT NULL UNIQUE,
      phone TEXT,
      password TEXT NOT NULL,
      department TEXT NOT NULL,
      strength TEXT NOT NULL,
      session_token_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_student_matric ON students(matric_no);

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

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_name TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );
  `);

  console.log("Inserting records into SQLite in a transaction...");

  // Insert courses
  const insertCourse = sqlite.prepare(`
    INSERT INTO courses (id, code, title, icon, scheduled_date, end_date, is_mock, is_master, is_locked, results_hidden, results_locked, force_start, duration, question_limit, attempts_allowed, question_timer_limit, multicourse_config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  sqlite.exec('BEGIN TRANSACTION;');
  for (const c of courses) {
    insertCourse.run(
      c._id.toString(),
      c.code || '',
      c.title || '',
      c.icon || 'Book',
      c.scheduled_date || null,
      c.end_date || null,
      c.is_mock ? 1 : 0,
      c.is_master ? 1 : 0,
      c.is_locked ? 1 : 0,
      c.results_hidden ? 1 : 0,
      c.results_locked ? 1 : 0,
      c.force_start ? 1 : 0,
      c.duration || 30,
      c.question_limit || 20,
      c.attempts_allowed || 1,
      c.question_timer_limit || 0,
      c.multicourse_config || null
    );
  }

  // Insert topics
  const insertTopic = sqlite.prepare(`
    INSERT INTO topics (id, course_id, name, question_count, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const t of topics) {
    insertTopic.run(
      t._id.toString(),
      t.course_id ? t.course_id.toString() : '',
      t.name || '',
      t.question_count || 0,
      t.notes || null
    );
  }

  // Insert questions
  const insertQuestion = sqlite.prepare(`
    INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, diagram_url, explanation, is_refined)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const q of questions) {
    insertQuestion.run(
      q._id.toString(),
      q.topic_id ? q.topic_id.toString() : '',
      q.text || '',
      q.a || '',
      q.b || '',
      q.c || null,
      q.d || null,
      q.correct_option || 'a',
      q.diagram_url || null,
      q.explanation || null,
      q.is_refined ? 1 : 0
    );
  }

  // Insert students
  const insertStudent = sqlite.prepare(`
    INSERT INTO students (id, name, email, matric_no, phone, password, department, strength, session_token_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of students) {
    insertStudent.run(
      s._id.toString(),
      s.name || '',
      s.email || null,
      s.matric_no || '',
      s.phone || null,
      s.password || '123456',
      s.department || 'Medicine & Surgery',
      s.strength || 'General',
      s.session_token_id || null
    );
  }

  // Insert results
  const insertResult = sqlite.prepare(`
    INSERT INTO results (id, student_id, course_id, parent_course_id, attempt_id, device_id, total_score, total_questions, percentage, grade, question_ids, topic_breakdown, student_answers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of results) {
    insertResult.run(
      r._id.toString(),
      r.student_id ? r.student_id.toString() : '',
      r.course_id ? r.course_id.toString() : '',
      r.parent_course_id ? r.parent_course_id.toString() : null,
      r.attempt_id || null,
      r.device_id || null,
      r.total_score || 0,
      r.total_questions || 0,
      r.percentage || 0,
      r.grade || 'F',
      r.question_ids || null,
      r.topic_breakdown || null,
      r.student_answers || null
    );
  }

  sqlite.exec('COMMIT;');
  sqlite.close();

  // Copy to php/ directory as well
  fs.copyFileSync(dbPath, path.resolve(__dirname, 'php', 'premed_portal.sqlite'));

  const stats = fs.statSync(dbPath);
  console.log(`\nSUCCESS! Created premed_portal.sqlite (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Copied to php/premed_portal.sqlite`);

  await mongoose.disconnect();
  process.exit(0);
}

buildSqliteDatabase().catch(err => {
  console.error("Error building SQLite database:", err);
  process.exit(1);
});
