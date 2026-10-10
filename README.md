# PreMed Test Portal (Pure PHP & SQLite Edition)

A high-performance, lightweight, and zero-setup academic CBT (Computer-Based Test) portal converted 100% to **pure PHP** with a portable, self-contained **SQLite database** (`premed_portal.sqlite`) containing all 5,630 questions.

---

## 🌟 Key Features

- **100% Pure PHP**: No node_modules, no React, no Vite build steps. Instant loading and zero build delay.
- **Embedded SQLite Database**: Pre-seeded with **5,630 questions**, 89 topics, 11 courses, 319 students, and past result records. Zero external cloud database configurations or connection strings required.
- **Full CBT Engine (`exam.php`)**:
  - Live countdown timer with auto-submit
  - Anti-cheating window blur detector
  - Question palette navigation drawer (answered, flagged, unanswered)
  - On-screen medical scientific calculator
  - Text-to-Speech (TTS) question reader
  - KaTeX mathematical and chemical equation rendering
- **Student Home Hub (`index.php`)**:
  - Direct candidate statistics and test history
  - Active exam alerts and course catalogue
  - Custom practice generator by subject and topic
- **Instructor Admin Dashboard (`admin_dashboard.php`)**:
  - Course deployment control (lock/unlock exams)
  - Full candidate directory and submission reviews
  - Searchable question bank across all 5,630 questions
- **Interactive Medical Modules**:
  - **Med Combat Arena (`combat.php`)**: Turn-based team duel
  - **AI Active Study Lab (`active_study.php`)**: Clinical notes digitizer and quiz generator
  - **Question Search (`question_search.php`)**: Instant keyword search across all items

---

## 🚀 Running Locally

### Option 1: Built-in PHP Development Server (Zero Setup)
Simply run:
```bash
php -S localhost:8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Apache / Nginx / XAMPP / WampServer / MAMP
Drop the project into your `htdocs` or web root directory and navigate to `http://localhost/premed-test-portal`.

---

## ☁️ Deployment

### Deploy to Vercel
The repository includes `vercel.json` configured with the serverless PHP runtime (`vercel-php@0.7.3`):
1. Import repository into [Vercel](https://vercel.com/new).
2. Leave build settings default.
3. Deploy!

### Deploy to Traditional Hosting / VPS (cPanel, Render, Railway, Fly.io, DigitalOcean)
Upload all repository files to your PHP 8.x web root. Ensure SQLite PDO extension is enabled (`php_pdo_sqlite`).

---

## 📁 Project Architecture

- `config/db.php`: PDO SQLite connection handler with WAL mode
- `includes/header.php`: Global responsive navigation, Tailwind CSS CDN, Lucide Icons, KaTeX formulas
- `includes/footer.php`: Global footer & interactive scripts
- `index.php`: Student Home Hub
- `login.php`: Student matric login and account registration
- `admin_login.php`: Instructor access authentication
- `admin_dashboard.php`: Instructor test control and management
- `courses.php`: Course/subject directory
- `practice.php`: Custom practice test builder
- `readiness.php`: System & browser checks before test
- `countdown.php`: 5-second countdown launcher
- `exam.php`: Full-featured CBT examination engine
- `submit_exam.php`: Server-side auto-grading engine
- `chill.php`: Post-test calming cooldown screen
- `results.php`: Detailed result breakdown and review
- `history.php`: Past examination attempts
- `leaderboard.php`: Candidate rankings
- `profile.php`: Student profile editor
- `combat.php`: Med Combat turn-based team duel
- `active_study.php`: AI Active Study Lab
- `question_search.php`: Searchable question bank
- `premed_portal.sqlite`: Complete SQLite database file (5,630 questions)
- `database_schema_and_questions.sql`: Raw SQL dump of schema and records
