const fs = require('fs');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is required.');
  console.error('Example: MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/dbname" node export_to_sql.js');
  process.exit(1);
}

async function exportFullDatabase() {
  console.log("Connecting to MongoDB Atlas...");
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;
    
    const courses = await db.collection('courses').find({}).toArray();
    const topics = await db.collection('topics').find({}).toArray();
    const questions = await db.collection('questions').find({}).toArray();
    const students = await db.collection('students').find({}).toArray();
    const results = await db.collection('results').find({}).toArray();
    const announcements = await db.collection('announcements').find({}).toArray();
    const settings = await db.collection('settings').find({}).toArray();

    console.log(`Export counts:`);
    console.log(`- Courses: ${courses.length}`);
    console.log(`- Topics: ${topics.length}`);
    console.log(`- Questions: ${questions.length}`);
    console.log(`- Students: ${students.length}`);
    console.log(`- Results: ${results.length}`);
    console.log(`- Announcements: ${announcements.length}`);
    console.log(`- Settings: ${settings.length}`);

    function escapeSql(val) {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      if (typeof val === 'boolean') return val ? 1 : 0;
      let str = String(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
          case "\0": return "\\0";
          case "\x08": return "\\b";
          case "\x09": return "\\t";
          case "\x1a": return "\\z";
          case "\n": return "\\n";
          case "\r": return "\\r";
          case "\"":
          case "'":
          case "\\":
          case "%": return "\\" + char;
          default: return char;
        }
      });
      return `'${str}'`;
    }

    let sql = `-- ========================================================\n`;
    sql += `-- Premed Test Portal - Complete MySQL Database Export\n`;
    sql += `-- Generated on: ${new Date().toISOString()}\n`;
    sql += `-- Compatible with MySQL 5.7+ / 8.0+ / MariaDB (XAMPP / Laragon)\n`;
    sql += `-- ========================================================\n\n`;
    sql += `CREATE DATABASE IF NOT EXISTS \`premed_portal\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
    sql += `USE \`premed_portal\`;\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // 1. STUDENTS
    sql += `-- Table \`students\`\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`students\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
    sql += `  \`name\` VARCHAR(255) NOT NULL,\n`;
    sql += `  \`email\` VARCHAR(255) NULL,\n`;
    sql += `  \`matric_no\` VARCHAR(100) NOT NULL UNIQUE,\n`;
    sql += `  \`phone\` VARCHAR(50) NULL,\n`;
    sql += `  \`password\` VARCHAR(255) NOT NULL,\n`;
    sql += `  \`department\` VARCHAR(150) NOT NULL,\n`;
    sql += `  \`strength\` VARCHAR(255) NOT NULL,\n`;
    sql += `  \`session_token_id\` VARCHAR(255) NULL,\n`;
    sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  INDEX \`idx_student_matric\` (\`matric_no\`),\n`;
    sql += `  INDEX \`idx_student_dept\` (\`department\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // 2. COURSES
    sql += `-- Table \`courses\`\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`courses\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
    sql += `  \`code\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`title\` VARCHAR(255) NOT NULL,\n`;
    sql += `  \`icon\` VARCHAR(50) DEFAULT 'Book',\n`;
    sql += `  \`scheduled_date\` VARCHAR(100) NULL,\n`;
    sql += `  \`end_date\` VARCHAR(100) NULL,\n`;
    sql += `  \`is_mock\` TINYINT(1) DEFAULT 1,\n`;
    sql += `  \`is_master\` TINYINT(1) DEFAULT 0,\n`;
    sql += `  \`is_locked\` TINYINT(1) DEFAULT 1,\n`;
    sql += `  \`results_hidden\` TINYINT(1) DEFAULT 0,\n`;
    sql += `  \`results_locked\` TINYINT(1) DEFAULT 1,\n`;
    sql += `  \`force_start\` TINYINT(1) DEFAULT 0,\n`;
    sql += `  \`duration\` INT DEFAULT 30,\n`;
    sql += `  \`question_limit\` INT DEFAULT 20,\n`;
    sql += `  \`attempts_allowed\` INT DEFAULT 1,\n`;
    sql += `  \`question_timer_limit\` INT DEFAULT 0,\n`;
    sql += `  \`multicourse_config\` TEXT NULL,\n`;
    sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // 3. TOPICS
    sql += `-- Table \`topics\`\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`topics\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
    sql += `  \`course_id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`name\` VARCHAR(255) NOT NULL,\n`;
    sql += `  \`question_count\` INT DEFAULT 0,\n`;
    sql += `  \`notes\` LONGTEXT NULL,\n`;
    sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  INDEX \`idx_topic_course\` (\`course_id\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // 4. QUESTIONS
    sql += `-- Table \`questions\`\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`questions\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
    sql += `  \`topic_id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`text\` LONGTEXT NOT NULL,\n`;
    sql += `  \`a\` TEXT NOT NULL,\n`;
    sql += `  \`b\` TEXT NOT NULL,\n`;
    sql += `  \`c\` TEXT NULL,\n`;
    sql += `  \`d\` TEXT NULL,\n`;
    sql += `  \`correct_option\` VARCHAR(10) NOT NULL,\n`;
    sql += `  \`diagram_url\` TEXT NULL,\n`;
    sql += `  \`explanation\` LONGTEXT NULL,\n`;
    sql += `  \`is_refined\` TINYINT(1) DEFAULT 0,\n`;
    sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  INDEX \`idx_question_topic\` (\`topic_id\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // 5. RESULTS
    sql += `-- Table \`results\`\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`results\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
    sql += `  \`student_id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`course_id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`parent_course_id\` VARCHAR(50) NULL,\n`;
    sql += `  \`attempt_id\` VARCHAR(100) NULL,\n`;
    sql += `  \`device_id\` VARCHAR(100) NULL,\n`;
    sql += `  \`total_score\` INT NOT NULL,\n`;
    sql += `  \`total_questions\` INT NOT NULL,\n`;
    sql += `  \`percentage\` DECIMAL(5,2) NOT NULL,\n`;
    sql += `  \`grade\` VARCHAR(10) NOT NULL,\n`;
    sql += `  \`question_ids\` LONGTEXT NULL,\n`;
    sql += `  \`topic_breakdown\` LONGTEXT NULL,\n`;
    sql += `  \`student_answers\` LONGTEXT NULL,\n`;
    sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  INDEX \`idx_result_student\` (\`student_id\`),\n`;
    sql += `  INDEX \`idx_result_course\` (\`course_id\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // 6. ANNOUNCEMENTS & SETTINGS
    sql += `-- Table \`announcements\`\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`announcements\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
    sql += `  \`title\` VARCHAR(255) NOT NULL,\n`;
    sql += `  \`content\` TEXT NOT NULL,\n`;
    sql += `  \`type\` VARCHAR(50) DEFAULT 'info',\n`;
    sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    sql += `-- Table \`settings\`\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`settings\` (\n`;
    sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
    sql += `  \`key_name\` VARCHAR(100) NOT NULL UNIQUE,\n`;
    sql += `  \`value\` LONGTEXT NOT NULL\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // DATA DUMPS
    // Students
    for (const s of students) {
      const id = s._id.toString();
      sql += `INSERT INTO \`students\` (\`id\`, \`name\`, \`email\`, \`matric_no\`, \`phone\`, \`password\`, \`department\`, \`strength\`, \`session_token_id\`) VALUES (${escapeSql(id)}, ${escapeSql(s.name)}, ${escapeSql(s.email)}, ${escapeSql(s.matric_no)}, ${escapeSql(s.phone)}, ${escapeSql(s.password)}, ${escapeSql(s.department)}, ${escapeSql(s.strength)}, ${escapeSql(s.session_token_id)});\n`;
    }
    sql += `\n`;

    // Courses
    for (const c of courses) {
      const id = c._id.toString();
      sql += `INSERT INTO \`courses\` (\`id\`, \`code\`, \`title\`, \`icon\`, \`scheduled_date\`, \`end_date\`, \`is_mock\`, \`is_master\`, \`is_locked\`, \`results_hidden\`, \`results_locked\`, \`force_start\`, \`duration\`, \`question_limit\`, \`attempts_allowed\`, \`question_timer_limit\`, \`multicourse_config\`) VALUES (${escapeSql(id)}, ${escapeSql(c.code)}, ${escapeSql(c.title)}, ${escapeSql(c.icon || 'Book')}, ${escapeSql(c.scheduled_date)}, ${escapeSql(c.end_date)}, ${c.is_mock ? 1 : 0}, ${c.is_master ? 1 : 0}, ${c.is_locked ? 1 : 0}, ${c.results_hidden ? 1 : 0}, ${c.results_locked ? 1 : 0}, ${c.force_start ? 1 : 0}, ${c.duration || 30}, ${c.question_limit || 20}, ${c.attempts_allowed || 1}, ${c.question_timer_limit || 0}, ${escapeSql(c.multicourse_config)});\n`;
    }
    sql += `\n`;

    // Topics
    for (const t of topics) {
      const id = t._id.toString();
      const courseId = t.course_id ? t.course_id.toString() : '';
      sql += `INSERT INTO \`topics\` (\`id\`, \`course_id\`, \`name\`, \`question_count\`, \`notes\`) VALUES (${escapeSql(id)}, ${escapeSql(courseId)}, ${escapeSql(t.name)}, ${t.question_count || 0}, ${escapeSql(t.notes)});\n`;
    }
    sql += `\n`;

    // Questions
    for (const q of questions) {
      const id = q._id.toString();
      const topicId = q.topic_id ? q.topic_id.toString() : '';
      sql += `INSERT INTO \`questions\` (\`id\`, \`topic_id\`, \`text\`, \`a\`, \`b\`, \`c\`, \`d\`, \`correct_option\`, \`diagram_url\`, \`explanation\`, \`is_refined\`) VALUES (${escapeSql(id)}, ${escapeSql(topicId)}, ${escapeSql(q.text)}, ${escapeSql(q.a)}, ${escapeSql(q.b)}, ${escapeSql(q.c)}, ${escapeSql(q.d)}, ${escapeSql(q.correct_option)}, ${escapeSql(q.diagram_url)}, ${escapeSql(q.explanation)}, ${q.is_refined ? 1 : 0});\n`;
    }
    sql += `\n`;

    // Results
    for (const r of results) {
      const id = r._id.toString();
      sql += `INSERT INTO \`results\` (\`id\`, \`student_id\`, \`course_id\`, \`parent_course_id\`, \`attempt_id\`, \`device_id\`, \`total_score\`, \`total_questions\`, \`percentage\`, \`grade\`, \`question_ids\`, \`topic_breakdown\`, \`student_answers\`) VALUES (${escapeSql(id)}, ${escapeSql(r.student_id ? r.student_id.toString() : '')}, ${escapeSql(r.course_id ? r.course_id.toString() : '')}, ${escapeSql(r.parent_course_id ? r.parent_course_id.toString() : '')}, ${escapeSql(r.attempt_id)}, ${escapeSql(r.device_id)}, ${r.total_score || 0}, ${r.total_questions || 0}, ${r.percentage || 0}, ${escapeSql(r.grade || 'F')}, ${escapeSql(r.question_ids)}, ${escapeSql(r.topic_breakdown)}, ${escapeSql(r.student_answers)});\n`;
    }
    sql += `\n`;

    // Announcements
    for (const a of announcements) {
      const id = a._id.toString();
      sql += `INSERT INTO \`announcements\` (\`id\`, \`title\`, \`content\`, \`type\`) VALUES (${escapeSql(id)}, ${escapeSql(a.title)}, ${escapeSql(a.content)}, ${escapeSql(a.type || 'info')});\n`;
    }
    sql += `\n`;

    // Settings
    for (const s of settings) {
      sql += `INSERT INTO \`settings\` (\`key_name\`, \`value\`) VALUES (${escapeSql(s.key)}, ${escapeSql(typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value))});\n`;
    }
    sql += `\n`;

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    fs.writeFileSync('database_schema_and_questions.sql', sql, 'utf8');
    console.log(`Successfully generated database_schema_and_questions.sql (${(sql.length / 1024 / 1024).toFixed(2)} MB)`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Export error:", err);
    process.exit(1);
  }
}

exportFullDatabase();
