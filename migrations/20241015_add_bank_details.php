<?php
// migrations/20241015_add_bank_details.php
require_once __DIR__ . '/../config/db.php';

$db = DB::connect();

$queries = [
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS account_number TEXT;",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS bank TEXT;",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS account_name TEXT;",
];

foreach ($queries as $sql) {
    $db->exec($sql);
}

echo "Banking columns added (if they did not exist).\n";
?>
