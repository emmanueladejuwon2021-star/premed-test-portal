# Premed Test Portal - PHP & MySQL Backend

This is the PHP + MySQL edition of the backend for **Premed Test Portal**, designed to run effortlessly on Apache / Nginx / XAMPP / Laragon / shared cPanel hosting.

## 1. Import Database Dump

The database dump files have been exported and formatted for MySQL / MariaDB:

- **`database_schema_and_questions.sql`** (Complete database with all tables, questions, students, and results).
- **`database_questions.sql`** (Question bank, courses, and topics only).

### Importing via phpMyAdmin:
1. Open phpMyAdmin (`http://localhost/phpmyadmin`).
2. Click **Import** in the top navigation bar.
3. Select `database_schema_and_questions.sql`.
4. Click **Import / Go**. The database `premed_portal` will be created with all 5,630 questions.

### Importing via MySQL CLI / Terminal:
```bash
mysql -u root -p < database_schema_and_questions.sql
```

## 2. Configuration (`config/database.php`)

By default, the connection credentials are:
- Host: `127.0.0.1` (Port 3306)
- Database: `premed_portal`
- User: `root`
- Password: `""` (empty)

You can override these using environment variables or editing `php_backend/config/database.php`:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`

## 3. Running the PHP Backend

### Option A: Via Laragon or XAMPP
Copy or symlink the project folder into `C:\laragon\www\premed_portal` or `C:\xampp\htdocs\premed_portal`.
Access the API at:
`http://localhost/premed_portal/php_backend/api/courses`

### Option B: Via PHP Built-in Server
From inside the `php_backend` directory:
```bash
php -S localhost:8000
```

## 4. Connecting the Frontend
The React frontend in `src/` can point to the PHP backend simply by changing the API proxy or base URL from port 3000 to port 8000 or your Apache URL.
The existing Node/TypeScript backend remains 100% intact and untouched.
