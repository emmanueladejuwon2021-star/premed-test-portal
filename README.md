# Apex PreMed Test Portal & Examination Command Center

An enterprise-grade, high-performance academic CBT (Computer-Based Test) simulation environment and proctoring control system for Pre-Medical & Health Sciences faculties.

Built with **Pure PHP 8.x** for the candidate portal, an asynchronous **Node.js Cloud Admin Command Center**, and **100% Pure Turso DB Cloud** (libSQL over HTTP v2 pipeline) — with **Zero SQLite**, zero native compilation dependencies, and instant cloud sync across AWS us-east-1.

---

## 🌟 Architecture & Core Pillars

### 1. Cloud-Native Architecture (Zero SQLite)
- **100% Turso DB Cloud**: Candidate portal and administrative console connect directly to Turso DB Cloud via libSQL HTTP pipeline API.
- **Atomic Cloud Pipeline**: Both the student exam environment and admin control panel share a single live source of truth with sub-200ms latency.
- **Zero Local Database Files**: Redundant local SQLite files, manual sync bridges, and database exports have been completely eliminated.

### 2. Administrator Command Center (`http://localhost:8899`)
- **Interactive Test Manager**:
  - Manually create proctored examinations for any accredited course.
  - Granular topic selection: Select *Comprehensive (All Topics)* or specific curriculum modules.
  - Configure individual test durations, question limits, fullscreen enforcement, tab-switch warning tolerances, auto-submission rules, scientific calculator availability, and question/option randomization.
  - Instant 1-click **Live / Offline** test deployment.
- **Live Candidate Radar**:
  - Real-time monitoring of students currently writing tests.
  - Tab-switch and window-blur detection with exact timestamps.
  - Instant administrative action: **Allow Retake** (resets session) or **Invalidate / Terminate Test**.
  - Auto-refreshes every 10 seconds via background telemetry polling.
- **Curriculum & Topic Management**:
  - Manage accredited pre-med courses (`BIO 101`, `CHM 101`, `PHY 101`, `ZOO 101`, `MTH 101`, `COS 101`, etc.) and official syllabus topics.
- **Cloud Question Bank**:
  - Author individual questions with LaTeX KaTeX formula rendering and custom options.
- **Dark Mode & Light Mode**:
  - Seamless theme switcher with persistent local state.

### 3. Student Examination Portal
- **Collapsible Fixed Navigation**:
  - Quick access to **Home**, **Tests**, **Study Room**, **Academic Resources**, **Past Question Practice**, and **Results**.
- **Proctored Examination Suite (`exam.php`)**:
  - Live countdown timer with auto-submit.
  - Anti-cheating telemetry detecting browser tab switches and window blur events.
  - Translucent candidate watermark overlay displaying Matric No and candidate name.
  - Embedded medical scientific calculator (enabled per test).
  - KaTeX rendering for mathematical equations and chemical formulas.
  - Text-to-Speech (TTS) item reader.
  - Visual question palette with bookmarking/flagging capability.

---

## 🚀 Getting Started

### 1. Running the Admin Command Center
Run the admin launcher script or start via Node.js:
```bash
# Using launcher
start_admin.bat

# Or directly via Node.js
node local_admin_server.js
```
Open **[http://localhost:8899](http://localhost:8899)** in your web browser.

### 2. Running the Student Portal Locally
Using PHP's built-in development server:
```bash
php -S localhost:8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your web browser.

---

## ☁️ Deployment

### Deploy to Vercel
The repository includes `vercel.json` configured for serverless PHP:
1. Import repository into [Vercel](https://vercel.com).
2. Configure Environment Variables (optional, credentials default to secure Turso cluster):
   - `TURSO_DATABASE_URL`: `https://premed-test-portal-emmanueladejuwon2021-star.aws-us-east-1.turso.io`
   - `TURSO_AUTH_TOKEN`: `<your-turso-jwt-token>`
3. Deploy!

### Deploy to Traditional Hosting / VPS (cPanel, Nginx, Apache)
1. Upload repository files to web root.
2. Ensure PHP `curl` and `json` extensions are enabled in `php.ini`.

---

## 📁 Repository Structure

```
├── config/
│   ├── db.php                     # Turso Cloud DB connection provider
│   └── turso.php                  # Turso PDO client (libSQL HTTP pipeline)
├── includes/
│   ├── header.php                 # Global fixed navbar & theme
│   └── footer.php                 # Global footer
├── local_admin_server.js          # Node.js Admin Command Center (Port 8899)
├── admin_ui_template.js           # Admin UI HTML template (Dark/Light mode)
├── index.php                      # Student Home Hub
├── login.php                      # Student authentication & registration
├── courses.php                    # Accredited Tests Directory
├── exam.php                       # Proctored CBT Examination Engine
├── submit_exam.php                # Server-side Auto-Grading Engine
├── results.php                    # Candidate result breakdown & review
├── history.php                    # Past examination attempts
├── practice.php                   # Custom practice generator
├── active_study.php               # AI Active Study Room
├── question_search.php            # Academic Resources & Question Bank
├── start_admin.bat                # Admin server launcher script
└── vercel.json                    # Vercel deployment configuration
```

---

## 🛡️ Academic Integrity & Proctoring Telemetry

The exam engine includes configurable security layers:
- **Tab-Switch Auditing**: Detects when candidates leave the examination tab or blur the viewport.
- **Maximum Warning Auto-Submission**: Automatically terminates and submits the test when allowed tab switches are exceeded.
- **Fullscreen Locking**: Fullscreen proctoring with warning modals upon exit.
- **Candidate Watermarking**: Anti-screenshot dynamic candidate watermark across questions.
- **Anti-Cheat Log Transmission**: Uses `navigator.sendBeacon` to log telemetry even if the window is abruptly closed.
