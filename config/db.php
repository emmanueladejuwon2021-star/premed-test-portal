<?php
/**
 * Database Configuration & Production Turso / SQLite Handler
 * Premed Test Portal (Enterprise Production Edition)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/turso.php';
require_once __DIR__ . '/../includes/csrf.php';
require_once __DIR__ . '/../includes/auth_helper.php';

class DB {
    private static mixed $connection = null;
    private static bool $migrated = false;

    public static function connect(): mixed {
        if (self::$connection !== null) {
            return self::$connection;
        }

        $defaultUrl = 'https://premed-test-portal-emmanueladejuwon2021-star.aws-us-east-1.turso.io';
        $defaultToken = ''; // Token must be provided via TURSO_AUTH_TOKEN environment variable

        $url = getenv('TURSO_DATABASE_URL') ?: (getenv('TURSO_URL') ?: $defaultUrl);
        $token = getenv('TURSO_AUTH_TOKEN') ?: getenv('TURSO_TOKEN');

        // Normalize libsql:// to https://
        if ($url) {
            $url = preg_replace('/^libsql:\/\//i', 'https://', $url);
        }

        if (empty($url) || empty($token)) {
            die("Turso Cloud Database credentials missing.");
        }

        try {
            self::$connection = new TursoPDO($url, $token);
            self::ensureSchema(self::$connection);
            restore_auth_sessions(self::$connection);
            return self::$connection;
        } catch (Exception $e) {
            die("Turso Cloud Database Connection Error: " . htmlspecialchars($e->getMessage()));
        }
    }

    public static function ensureSchema(TursoPDO $pdo): void {
        if (self::$migrated) {
            return;
        }
        self::$migrated = true;

        // 1. Ensure students columns exist
        $studentCols = [
            'email' => 'TEXT',
            'phone' => 'TEXT',
            'account_number' => 'TEXT',
            'bank' => 'TEXT',
            'account_name' => 'TEXT',
            'strength' => 'TEXT'
        ];
        foreach ($studentCols as $col => $type) {
            try {
                $pdo->exec("ALTER TABLE students ADD COLUMN {$col} {$type}");
            } catch (Exception $e) {}
        }

        // 2. Ensure results proctoring columns exist
        $resultCols = [
            'tab_switches' => 'INTEGER DEFAULT 0',
            'is_flagged_cheating' => 'INTEGER DEFAULT 0',
            'cheating_log' => 'TEXT'
        ];
        foreach ($resultCols as $col => $type) {
            try {
                $pdo->exec("ALTER TABLE results ADD COLUMN {$col} {$type}");
            } catch (Exception $e) {}
        }

        // 3. Ensure courses lock status exists
        try {
            $pdo->exec("ALTER TABLE courses ADD COLUMN is_locked INTEGER DEFAULT 0");
        } catch (Exception $e) {}

        // 4. Ensure questions explanation & diagram columns exist
        try {
            $pdo->exec("ALTER TABLE questions ADD COLUMN diagram_url TEXT");
        } catch (Exception $e) {}
        try {
            $pdo->exec("ALTER TABLE questions ADD COLUMN explanation TEXT");
        } catch (Exception $e) {}

        // 5. Ensure exam_sessions table exists
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS exam_sessions (
                id TEXT PRIMARY KEY,
                student_id TEXT,
                course_id TEXT,
                test_id TEXT,
                status TEXT DEFAULT 'IN_PROGRESS',
                tab_switches INTEGER DEFAULT 0,
                cheating_log TEXT,
                total_score INTEGER DEFAULT 0,
                total_questions INTEGER DEFAULT 0,
                percentage REAL DEFAULT 0,
                grade TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        } catch (Exception $e) {}

        // 6. Auto-seed Physics: Physical Quantities & Dimensional Analysis question bank
        self::seedPhysicsQuestions($pdo);
    }

    /**
     * Auto-seeds the 24 Physical Quantities & Dimensional Analysis questions under PHY 101
     */
    public static function seedPhysicsQuestions($pdo) {
        static $seeded = false;
        if ($seeded) return;
        $seeded = true;

        try {
            // A. Ensure Course exists
            $cStmt = $pdo->prepare("SELECT id FROM courses WHERE code = 'PHY 101' OR UPPER(title) LIKE '%PHYSICS%' LIMIT 1");
            $cStmt->execute();
            $course = $cStmt->fetch();
            if (!$course) {
                $courseId = 'phy_cbt_101';
                $pdo->prepare("INSERT INTO courses (id, code, title, icon, is_mock, is_locked, duration, question_limit) VALUES (?, 'PHY 101', 'General Medical Physics', 'Atom', 1, 0, 30, 24)")->execute([$courseId]);
            } else {
                $courseId = $course['id'];
            }

            // B. Ensure Topic exists
            $tStmt = $pdo->prepare("SELECT id FROM topics WHERE course_id = ? AND (name LIKE '%Physical Quantities%' OR name LIKE '%Dimensional%') LIMIT 1");
            $tStmt->execute([$courseId]);
            $topic = $tStmt->fetch();
            if (!$topic) {
                $topicId = 'topic_phy_dim_analysis';
                $pdo->prepare("INSERT INTO topics (id, course_id, name, question_count) VALUES (?, ?, 'Physical Quantities, Units & Dimensions', 24)")->execute([$topicId, $courseId]);
            } else {
                $topicId = $topic['id'];
            }

            // C. 24 Comprehensive Questions with Dimensional Analysis
            $questions = [
                [
                    'id' => 'phy_dim_q01',
                    'text' => 'A stretched string vibrates with frequency f. Assuming f depends on its tension T, mass per unit length μ and length l, which relation does dimensional analysis give? (k is a dimensionless constant.)',
                    'a' => 'f = k (1/l) √(T/μ)',
                    'b' => 'f = k l √(T/μ)',
                    'c' => 'f = k (1/l) √(μ/T)',
                    'd' => 'f = k l² (T/μ)',
                    'correct_option' => 'A',
                    'explanation' => "Assume f = k Tˣ μʸ lᶻ. With [f] = T⁻¹, [T] = MLT⁻², [μ] = ML⁻¹ and [l] = L:\nT⁻¹ = M^(x+y) L^(x−y+z) T^(−2x)\n- Time: −2x = −1, so x = ½\n- Mass: x + y = 0, so y = −½\n- Length: x − y + z = 0, so z = −1\n\nSo f = k (1/l)√(T/μ). Experiment gives k = ½ for the fundamental mode, so f = (1/2l)√(T/μ).\n- B: √(T/μ) is LT⁻¹, so f would be L²T⁻¹.\n- C: inverting T and μ gives the wrong dimensions.\n- D: l²(T/μ) is L⁴T⁻²."
                ],
                [
                    'id' => 'phy_dim_q02',
                    'text' => 'The viscous force F on a sphere of radius r moving with angular velocity ω through a fluid of viscosity η is F = k rᵃ ηᵇ ωᶜ. What are a, b and c?',
                    'a' => 'a = 4, b = 1, c = 1',
                    'b' => 'a = 2, b = 1, c = 1',
                    'c' => 'a = 1, b = 1, c = 2',
                    'd' => 'a = 2, b = 2, c = 1',
                    'correct_option' => 'B',
                    'explanation' => "MLT⁻² = Lᵃ (ML⁻¹T⁻¹)ᵇ (T⁻¹)ᶜ = M^b L^(a−b) T^(−b−c)\n- Mass: b = 1\n- Length: a − b = 1, so a = 2\n- Time: −b − c = −2, so c = 1\n\nSo F = k r² η ω, consistent with Stokes' law F = 6πηrv, since v = ωr.\n- A: length exponent a − b = 3, not 1.\n- C: gives M¹L⁰T⁻³.\n- D: gives M², but F has M¹."
                ],
                [
                    'id' => 'phy_dim_q03',
                    'text' => 'Is P = ½ρv² + ρgh dimensionally correct?',
                    'a' => 'Yes, every term has dimensions ML⁻¹T⁻²',
                    'b' => 'No, because ½ρv² has dimensions ML²T⁻²',
                    'c' => 'No, because ρgh has the dimensions of force',
                    'd' => 'It cannot be checked, because ½ is a number',
                    'correct_option' => 'A',
                    'explanation' => "- [P] = MLT⁻² / L² = ML⁻¹T⁻²\n- [½ρv²] = (ML⁻³)(L²T⁻²) = ML⁻¹T⁻²\n- [ρgh] = (ML⁻³)(LT⁻²)(L) = ML⁻¹T⁻²\n\nAll terms match, so the equation is dimensionally consistent (it is Bernoulli's equation).\n- B: ML²T⁻² is energy, but ½ρv² is energy per volume, which is pressure.\n- C: force is MLT⁻², while ρgh is force per area.\n- D: pure numbers are dimensionless and don't affect the check.\n\nDimensional consistency cannot detect a wrong numerical factor."
                ],
                [
                    'id' => 'phy_dim_q04',
                    'text' => 'Which is the internationally agreed system of units (SI)?',
                    'a' => 'lb, ft, sec',
                    'b' => 'g, m, sec',
                    'c' => 'kg, m, sec',
                    'd' => 'cm, g, sec',
                    'correct_option' => 'C',
                    'explanation' => "SI base units for mass, length and time are the kilogram (kg), metre (m) and second (s). Option A is the imperial system. Options B and D use the gram (older CGS/MGS systems)."
                ],
                [
                    'id' => 'phy_dim_q05',
                    'text' => 'Which is the unit of latent heat? (I) N s (II) N m (III) N/m² (IV) J K⁻¹ (V) J kg⁻¹',
                    'a' => 'I',
                    'b' => 'II',
                    'c' => 'III and IV',
                    'd' => 'V',
                    'correct_option' => 'D',
                    'explanation' => "Latent heat is energy per unit mass (L = Q/m), so J kg⁻¹. N s is impulse, N m is energy, N/m² is pressure and J K⁻¹ is heat capacity."
                ],
                [
                    'id' => 'phy_dim_q06',
                    'text' => 'What is the unit of thermal conductivity?',
                    'a' => 'J s⁻¹ m⁻¹ K⁻¹',
                    'b' => 'J s m⁻¹ K⁻¹',
                    'c' => 'W m K⁻¹',
                    'd' => 'J m⁻² K⁻¹',
                    'correct_option' => 'A',
                    'explanation' => "From Q/t = kAΔθ/l, k = (Q/t)·l/(AΔθ), giving (J s⁻¹)(m)/(m² K) = J s⁻¹ m⁻¹ K⁻¹ = W m⁻¹ K⁻¹. B has s in the numerator and C has m in the numerator, both wrong. D has no time dependence."
                ],
                [
                    'id' => 'phy_dim_q07',
                    'text' => 'Which is NOT a unit of power?',
                    'a' => 'J s⁻¹',
                    'b' => 'V A',
                    'c' => 'N m s⁻¹',
                    'd' => 'N m',
                    'correct_option' => 'D',
                    'explanation' => "N m is a joule (energy) or torque, with no time factor. A is the watt by definition (J s⁻¹). V A = (J/C)(C/s) = J/s. N m s⁻¹ = force × velocity = J/s."
                ],
                [
                    'id' => 'phy_dim_q08',
                    'text' => 'Which quantity has dimension ML²T⁻²?',
                    'a' => 'moment of a force',
                    'b' => 'work',
                    'c' => 'acceleration',
                    'd' => 'moment of a force and work',
                    'correct_option' => 'D',
                    'explanation' => "Torque = force × distance = MLT⁻² × L = ML²T⁻², and work has the same dimensions. Acceleration is LT⁻². Torque and work share dimensions but are different quantities."
                ],
                [
                    'id' => 'phy_dim_q09',
                    'text' => 'What is the unit of the quantity of electricity?',
                    'a' => 'coulomb',
                    'b' => 'volt',
                    'c' => 'ampere',
                    'd' => 'ohm',
                    'correct_option' => 'A',
                    'explanation' => "Quantity of electricity is charge, measured in coulombs (1 C = 1 A s). The volt is potential difference, the ampere is current and the ohm is resistance."
                ],
                [
                    'id' => 'phy_dim_q10',
                    'text' => 'Which is NOT a fundamental SI unit?',
                    'a' => 'Metre',
                    'b' => 'Ampere',
                    'c' => 'Mole',
                    'd' => 'Newton',
                    'correct_option' => 'D',
                    'explanation' => "The seven base units are metre, kilogram, second, ampere, kelvin, mole and candela. The newton is derived: 1 N = 1 kg m s⁻²."
                ],
                [
                    'id' => 'phy_dim_q11',
                    'text' => 'In a gas experiment at constant temperature, pressure is plotted against 1/V. What is the unit of the slope?',
                    'a' => 'newton',
                    'b' => 'newton/m',
                    'c' => 'joule',
                    'd' => 'newton/m³',
                    'correct_option' => 'C',
                    'explanation' => "Boyle's law gives P = constant × (1/V), so the slope is PV = (N m⁻²)(m³) = N m = J."
                ],
                [
                    'id' => 'phy_dim_q12',
                    'text' => 'Which is a derived unit?',
                    'a' => 'Kilogramme',
                    'b' => 'Metre',
                    'c' => 'Kelvin',
                    'd' => 'Newton',
                    'correct_option' => 'D',
                    'explanation' => "The kilogram, metre and kelvin are base units. The newton is built from base units (kg m s⁻²)."
                ],
                [
                    'id' => 'phy_dim_q13',
                    'text' => 'Which unit is equivalent to kg m s⁻¹?',
                    'a' => 'J/s',
                    'b' => 'N/s',
                    'c' => 'N s',
                    'd' => 'N m s',
                    'correct_option' => 'C',
                    'explanation' => "N s = (kg m s⁻²)(s) = kg m s⁻¹, the unit of momentum and impulse. J/s is the watt, N/s is kg m s⁻³, and N m s is kg m² s⁻¹."
                ],
                [
                    'id' => 'phy_dim_q14',
                    'text' => 'Which are correct SI units of the quantities indicated? I. N s (impulse) II. N m (torque) III. W (power) IV. kg m s⁻¹ (momentum)',
                    'a' => 'I and II only',
                    'b' => 'I, II and III only',
                    'c' => 'I, II and IV only',
                    'd' => 'I, II, III and IV',
                    'correct_option' => 'D',
                    'explanation' => "Impulse = F × t (N s), torque = F × d (N m), power is in W, and momentum is in kg m s⁻¹. All four are correct."
                ],
                [
                    'id' => 'phy_dim_q15',
                    'text' => 'The product PV has dimensions of:',
                    'a' => 'density',
                    'b' => 'power',
                    'c' => 'momentum',
                    'd' => 'energy',
                    'correct_option' => 'D',
                    'explanation' => "[PV] = (ML⁻¹T⁻²)(L³) = ML²T⁻², the dimensions of energy. Density is ML⁻³, power is ML²T⁻³ and momentum is MLT⁻¹."
                ],
                [
                    'id' => 'phy_dim_q16',
                    'text' => 'Which is a derived quantity?',
                    'a' => 'Length',
                    'b' => 'Time',
                    'c' => 'Force',
                    'd' => 'Mass',
                    'correct_option' => 'C',
                    'explanation' => "Length, time and mass are base quantities. Force is derived: F = ma, [F] = MLT⁻²."
                ],
                [
                    'id' => 'phy_dim_q17',
                    'text' => 'What is the SI unit of pressure?',
                    'a' => 'N',
                    'b' => 'Pa (N m⁻²)',
                    'c' => 'J',
                    'd' => 'W',
                    'correct_option' => 'B',
                    'explanation' => "Pressure = force/area, so N m⁻², called the pascal. N is force, J is energy and W is power."
                ],
                [
                    'id' => 'phy_dim_q18',
                    'text' => 'The radian is best classified as:',
                    'a' => 'an SI base unit',
                    'b' => 'a dimensionless derived unit (formerly "supplementary")',
                    'c' => 'a unit of length',
                    'd' => 'a unit of angular velocity',
                    'correct_option' => 'B',
                    'explanation' => "An angle in radians is arc ÷ radius, a ratio of lengths, so it is dimensionless. Older books call it a supplementary unit, and since 1995 the SI treats it as a dimensionless derived unit. Angular velocity is in rad s⁻¹, not rad."
                ],
                [
                    'id' => 'phy_dim_q19',
                    'text' => 'The unit of momentum is:',
                    'a' => 'J/s',
                    'b' => 'N/s',
                    'c' => 'kg m/s',
                    'd' => 'N m s',
                    'correct_option' => 'C',
                    'explanation' => "Momentum = mass × velocity = kg m s⁻¹ (equivalently N s)."
                ],
                [
                    'id' => 'phy_dim_q20',
                    'text' => 'Which is the dimension of power?',
                    'a' => 'ML²T⁻³',
                    'b' => 'MLT⁻²',
                    'c' => 'ML²T⁻²',
                    'd' => 'ML⁻¹T⁻²',
                    'correct_option' => 'A',
                    'explanation' => "Power = energy/time = ML²T⁻²/T = ML²T⁻³. B is force, C is energy and D is pressure."
                ],
                [
                    'id' => 'phy_dim_q21',
                    'text' => 'In which are the units correctly indicated? (I) Weight [N] (II) Power [J/s] (III) Momentum [kg m/s] (IV) Acceleration [N/kg]',
                    'a' => 'I and II',
                    'b' => 'III and IV',
                    'c' => 'I, II and III',
                    'd' => 'I, II, III and IV',
                    'correct_option' => 'D',
                    'explanation' => "Weight is a force (N). Power is J/s. Momentum is kg m/s. Acceleration = F/m, so N/kg = m s⁻²."
                ],
                [
                    'id' => 'phy_dim_q22',
                    'text' => 'The watt is equivalent to:',
                    'a' => 'N s',
                    'b' => 'J s',
                    'c' => 'J/s',
                    'd' => 'kg m s⁻²',
                    'correct_option' => 'C',
                    'explanation' => "1 W = 1 J s⁻¹ = 1 N m s⁻¹ = 1 kg m² s⁻³. N s is impulse, J s is the unit of Planck's constant (action), and kg m s⁻² is the newton."
                ],
                [
                    'id' => 'phy_dim_q23',
                    'text' => 'Which quantity has the same unit as the kilowatt-hour?',
                    'a' => 'Force × time',
                    'b' => 'Force × distance',
                    'c' => 'Force × velocity',
                    'd' => 'Force × acceleration',
                    'correct_option' => 'B',
                    'explanation' => "1 kWh = 1000 W × 3600 s = 3.6 × 10⁶ J, a unit of energy. Force × distance is work. Force × time is impulse, and force × velocity is power."
                ],
                [
                    'id' => 'phy_dim_q24',
                    'text' => 'In the van der Waals equation (P + a/V²)(V − b) = RT, what are the dimensions of a?',
                    'a' => 'MLT⁻²',
                    'b' => 'ML⁵T⁻²',
                    'c' => 'ML⁻¹T⁻²',
                    'd' => 'ML²T⁻²',
                    'correct_option' => 'B',
                    'explanation' => "Only like quantities can be added, so a/V² has the dimensions of pressure. [a] = [P][V²] = (ML⁻¹T⁻²)(L⁶) = ML⁵T⁻². C is the dimension of pressure itself."
                ]
            ];

            foreach ($questions as $q) {
                // Check by ID or matching prompt
                $chk = $pdo->prepare("SELECT id FROM questions WHERE id = ? OR (topic_id = ? AND text = ?) LIMIT 1");
                $chk->execute([$q['id'], $topicId, $q['text']]);
                $existing = $chk->fetch();

                if (!$existing) {
                    $insertQ = $pdo->prepare("INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $insertQ->execute([$q['id'], $topicId, $q['text'], $q['a'], $q['b'], $q['c'], $q['d'], $q['correct_option'], $q['explanation']]);
                } else {
                    $updQ = $pdo->prepare("UPDATE questions SET text = ?, a = ?, b = ?, c = ?, d = ?, correct_option = ?, explanation = ? WHERE id = ?");
                    $updQ->execute([$q['text'], $q['a'], $q['b'], $q['c'], $q['d'], $q['correct_option'], $q['explanation'], $existing['id']]);
                }
            }

            // Update topic question count
            $cnt = $pdo->prepare("SELECT COUNT(*) FROM questions WHERE topic_id = ?");
            $cnt->execute([$topicId]);
            $totalQ = (int)$cnt->fetchColumn();
            $pdo->prepare("UPDATE topics SET question_count = ? WHERE id = ?")->execute([$totalQ, $topicId]);

        } catch (Exception $e) {
            // Log error silently to not disrupt requests
            error_log("Failed to seed physics questions: " . $e->getMessage());
        }
    }
}

// Auto-initialize DB connection, run schema check, and restore sessions if credentials are present
if (!empty(getenv('TURSO_AUTH_TOKEN')) || !empty(getenv('TURSO_TOKEN'))) {
    try {
        DB::connect();
    } catch (Exception $e) {
        // Silently continue if DB connection cannot be established immediately
    }
}
