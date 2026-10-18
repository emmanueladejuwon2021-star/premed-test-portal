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

        // 4. Ensure questions explanation, diagram & bank_type columns exist
        try {
            $pdo->exec("ALTER TABLE questions ADD COLUMN diagram_url TEXT");
        } catch (Exception $e) {}
        try {
            $pdo->exec("ALTER TABLE questions ADD COLUMN explanation TEXT");
        } catch (Exception $e) {}
        try {
            $pdo->exec("ALTER TABLE questions ADD COLUMN bank_type TEXT DEFAULT 'past'");
            $pdo->exec("UPDATE questions SET bank_type = 'past' WHERE bank_type IS NULL OR bank_type = ''");
        } catch (Exception $e) {}

        // 5. Ensure exam_sessions table & proctor columns exist
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS exam_sessions (
                id TEXT PRIMARY KEY,
                student_id TEXT,
                matric_no TEXT,
                student_name TEXT,
                course_id TEXT,
                course_code TEXT,
                test_id TEXT,
                status TEXT DEFAULT 'IN_PROGRESS',
                tab_switches INTEGER DEFAULT 0,
                cheating_log TEXT,
                total_score INTEGER DEFAULT 0,
                total_questions INTEGER DEFAULT 0,
                percentage REAL DEFAULT 0,
                grade TEXT,
                latest_frame TEXT,
                proctor_warning TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        } catch (Exception $e) {}

        try {
            $pdo->exec("ALTER TABLE exam_sessions ADD COLUMN latest_frame TEXT");
        } catch (Exception $e) {}
        try {
            $pdo->exec("ALTER TABLE exam_sessions ADD COLUMN proctor_warning TEXT");
        } catch (Exception $e) {}

        // 6. Ensure tests table has include_past_questions column
        try {
            $pdo->exec("ALTER TABLE tests ADD COLUMN include_past_questions INTEGER DEFAULT 0");
        } catch (Exception $e) {}

        // 6. Auto-seed Physics: Physical Quantities & Dimensional Analysis question bank
        self::seedPhysicsQuestions($pdo);

        // 7. Auto-seed Physics: Scalar and Vector Quantities question bank
        self::seedVectorsAndScalarsQuestions($pdo);
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
            $tStmt = $pdo->prepare("SELECT id FROM topics WHERE course_id = ? AND (id = 'top_phy101_1' OR name LIKE '%Physical quantities%' OR name LIKE '%Dimensional%') LIMIT 1");
            $tStmt->execute([$courseId]);
            $topic = $tStmt->fetch();
            if (!$topic) {
                $topicId = 'top_phy101_1';
                $pdo->prepare("INSERT INTO topics (id, course_id, name, question_count) VALUES (?, ?, 'Physical quantities, units, and dimensions', 24)")->execute([$topicId, $courseId]);
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
                    $insertQ = $pdo->prepare("INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation, bank_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'past')");
                    $insertQ->execute([$q['id'], $topicId, $q['text'], $q['a'], $q['b'], $q['c'], $q['d'], $q['correct_option'], $q['explanation']]);
                } else {
                    $updQ = $pdo->prepare("UPDATE questions SET text = ?, a = ?, b = ?, c = ?, d = ?, correct_option = ?, explanation = ?, bank_type = 'past' WHERE id = ?");
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

    /**
     * Auto-seeds the 16 Scalar and Vector Quantities questions under PHY 101 with complete unshortened explanations
     */
    public static function seedVectorsAndScalarsQuestions($pdo) {
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
            $tStmt = $pdo->prepare("SELECT id FROM topics WHERE course_id = ? AND (id = 'top_phy101_2' OR name LIKE '%Vector%' OR name LIKE '%Scalar%') LIMIT 1");
            $tStmt->execute([$courseId]);
            $topic = $tStmt->fetch();
            if (!$topic) {
                $topicId = 'top_phy101_2';
                $pdo->prepare("INSERT INTO topics (id, course_id, name, question_count) VALUES (?, ?, 'Scalars and Vectors', 16)")->execute([$topicId, $courseId]);
            } else {
                $topicId = $topic['id'];
            }

            // C. 16 Comprehensive Questions with Full Unshortened Explanations & Solutions
            $questions = [
                [
                    'id' => 'phy_vec_q01',
                    'text' => 'A car is travelling eastward at 40 m/s. A 30 m/s wind is blowing southward. What is the speed and direction of the car relative to its original direction (taking the wind\'s effect on the car\'s velocity)?',
                    'a' => '50 m/s, 37° south of east',
                    'b' => '50 m/s, 53° south of east',
                    'c' => '70 m/s, 37° south of east',
                    'd' => '35 m/s, 37° south of east',
                    'correct_option' => 'A',
                    'explanation' => "The two velocities are perpendicular, so the resultant is their vector sum.\n- East component: 40 m/s\n- South component: 30 m/s\n- Speed = √(40² + 30²) = √(1600 + 900) = √2500 = 50 m/s\n- Direction: θ = tan⁻¹(30/40) = tan⁻¹(0.75) ≈ 37° south of east\n\n- B: 53° is tan⁻¹(40/30), the angle measured from the south direction. The question asks for the angle from the original eastward direction.\n- C: 70 m/s adds the magnitudes as scalars. Perpendicular vectors don't add that way.\n- D: 35 m/s is the average of the two speeds, which has no physical meaning here."
                ],
                [
                    'id' => 'phy_vec_q02',
                    'text' => 'Two forces act on a block of mass 2 kg: 100 N at 170.0° and 100 N at 50.0° (angles from the positive x-axis). Find the resultant force.',
                    'a' => '100 N at 110°',
                    'b' => '200 N at 110°',
                    'c' => '100 N at 70°',
                    'd' => '94 N at 90°',
                    'correct_option' => 'A',
                    'explanation' => "Resolve each force into components.\n- F₁ₓ = 100 cos 170° ≈ −98.5 N, F₁ᵧ = 100 sin 170° ≈ 17.4 N\n- F₂ₓ = 100 cos 50° ≈ 64.3 N, F₂ᵧ = 100 sin 50° ≈ 76.6 N\n- Rₓ ≈ −34.2 N, Rᵧ ≈ 94.0 N\n- |R| = √(34.2² + 94.0²) ≈ 100 N\n\nRₓ is negative and Rᵧ is positive, so R lies in the second quadrant. The reference angle is tan⁻¹(94.0/34.2) ≈ 70°, so the direction is 180° − 70° = 110°.\n\nCheck: the forces are 120° apart (170° − 50°) and equal in size, so the resultant equals each force (100 N). It points along the bisector, (170° + 50°)/2 = 110°.\n\n- B: 200 N is the result of adding magnitudes and ignoring direction.\n- C: 70° is the reference angle, which forgets that Rₓ is negative.\n- D: 94 N is only the y-component.\n\nThe mass of 2 kg doesn't affect the resultant force. It would only matter if you wanted the acceleration (a = R/m = 50 m/s²)."
                ],
                [
                    'id' => 'phy_vec_q03',
                    'text' => 'Find the magnitude of R = 8i − 12j and the angle it makes with the positive x-axis.',
                    'a' => '14.4 units, −56.3° (or 303.7°)',
                    'b' => '20 units, −56.3°',
                    'c' => '14.4 units, +56.3°',
                    'd' => '14.4 units, −33.7°',
                    'correct_option' => 'A',
                    'explanation' => "- |R| = √(8² + (−12)²) = √(64 + 144) = √208 ≈ 14.4 units\n- θ = tan⁻¹(−12/8) = tan⁻¹(−1.5) ≈ −56.3°, equivalent to 303.7° measured anticlockwise\n\nThe x-component is positive and the y-component is negative, so R is in the fourth quadrant.\n\n- B: 20 is 8 + 12, adding components instead of using Pythagoras.\n- C: +56.3° would put the vector in the first quadrant, ignoring the minus sign.\n- D: 33.7° comes from tan⁻¹(8/12), with the components swapped."
                ],
                [
                    'id' => 'phy_vec_q04',
                    'text' => 'Two vectors are A = 3.0i − 4.5j and B = −2.5i + 5.0j. Find the magnitude and direction of their sum C = A + B.',
                    'a' => '|C| = 0.71, θ = 45°',
                    'b' => '|C| = 1.0, θ = 45°',
                    'c' => '|C| = 0.71, θ = 135°',
                    'd' => '|C| = 0.50, θ = 45°',
                    'correct_option' => 'A',
                    'explanation' => "The original didn't state what operation was wanted. The answer given (C = 0.5i + 0.5j) matches A + B, so I used that.\n- Cₓ = 3.0 + (−2.5) = 0.5\n- Cᵧ = −4.5 + 5.0 = 0.5\n- |C| = √(0.5² + 0.5²) = √0.5 ≈ 0.71\n- θ = tan⁻¹(0.5/0.5) = 45°\n\n- B: 1.0 is 0.5 + 0.5, adding the components instead of using Pythagoras.\n- C: 135° would need a negative x-component, but Cₓ is positive.\n- D: 0.50 is the value of a single component, not the magnitude."
                ],
                [
                    'id' => 'phy_vec_q05',
                    'text' => 'Given A = 6i + 3j − k and B = i − 2j + 4k, find the magnitude of the vector 2A − 3B.',
                    'a' => '15.0',
                    'b' => '18.0',
                    'c' => '20.5',
                    'd' => '23.4',
                    'correct_option' => 'C',
                    'explanation' => "(The original left B incomplete. I supplied B = i − 2j + 4k, so the numerical answer is only valid for this B.)\n\n- 2A = 12i + 6j − 2k\n- 3B = 3i − 6j + 12k\n- 2A − 3B = (12 − 3)i + (6 + 6)j + (−2 − 12)k = 9i + 12j − 14k\n- |2A − 3B| = √(81 + 144 + 196) = √421 ≈ 20.5\n\n- A: 15.0 is √(9² + 12²), leaving out the k-component.\n- B: 18.0 is |2A + 3B| = |15i + 0j + 10k| = √325, the wrong sign.\n- D: 23.4 is |3A − 2B| = |16i + 13j − 11k| = √546, the wrong coefficients."
                ],
                [
                    'id' => 'phy_vec_q06',
                    'text' => 'Find the angle between A = 2i + 3j + k and B = −4i + 2j − k.',
                    'a' => '79.9°',
                    'b' => '100.1°',
                    'c' => '90°',
                    'd' => '10.1°',
                    'correct_option' => 'B',
                    'explanation' => "- A · B = (2)(−4) + (3)(2) + (1)(−1) = −8 + 6 − 1 = −3\n- |A| = √(4 + 9 + 1) = √14\n- |B| = √(16 + 4 + 1) = √21\n- cos θ = −3/√(14 × 21) = −3/√294 ≈ −0.175\n- θ = cos⁻¹(−0.175) ≈ 100.1°\n\nThe dot product is negative, so the angle is obtuse (greater than 90°).\n\n- A: 79.9° is cos⁻¹(+0.175), which drops the minus sign.\n- C: 90° would need A · B = 0, but here A · B = −3.\n- D: 10.1° is 90° − 79.9°, an unrelated subtraction."
                ],
                [
                    'id' => 'phy_vec_q07',
                    'text' => 'Three vectors are A = 3i + 3j − 2k, B = −i − 4j + 2k and C = 2i + 2j + k. Find A · (B × C).',
                    'a' => '21',
                    'b' => '−21',
                    'c' => '−9',
                    'd' => '0',
                    'correct_option' => 'B',
                    'explanation' => "First compute B × C using the determinant:\n\n| i | j | k |\n|---|---|---|\n| −1 | −4 | 2 |\n| 2 | 2 | 1 |\n\n- i-component: (−4)(1) − (2)(2) = −8\n- j-component: (2)(2) − (−1)(1) = 5\n- k-component: (−1)(2) − (−4)(2) = 6\n\nSo B × C = −8i + 5j + 6k.\n\nThen A · (B × C) = (3)(−8) + (3)(5) + (−2)(6) = −24 + 15 − 12 = −21.\n\nThe scalar triple product is a scalar. Its absolute value (21) is the volume of the parallelepiped formed by the three vectors.\n\n- A: +21 comes from C × B, which reverses the sign because the cross product is anticommutative.\n- C: −9 comes from adding the wrong terms.\n- D: 0 would mean the three vectors are coplanar, which is not the case."
                ],
                [
                    'id' => 'phy_vec_q08',
                    'text' => 'Which statement correctly differentiates scalar and vector quantities?',
                    'a' => 'A scalar has magnitude only (e.g. mass, speed, temperature, energy). A vector has both magnitude and direction (e.g. displacement, velocity, force, acceleration).',
                    'b' => 'A scalar has direction only. A vector has magnitude only.',
                    'c' => 'Speed and velocity are both scalars, while force and mass are both vectors.',
                    'd' => 'Scalars are added using the triangle law, while vectors are added by ordinary arithmetic.',
                    'correct_option' => 'A',
                    'explanation' => "Scalars are fully described by a number and unit, and they add by ordinary arithmetic. Vectors need magnitude and direction, and they add by the triangle or parallelogram law (or by components).\n\n- B: reverses the definitions.\n- C: velocity is a vector and mass is a scalar.\n- D: reverses the addition rules."
                ],
                [
                    'id' => 'phy_vec_q09',
                    'text' => 'Which of the following physical quantities is NOT a vector?',
                    'a' => 'velocity',
                    'b' => 'speed',
                    'c' => 'force',
                    'd' => 'electric field intensity',
                    'correct_option' => 'B',
                    'explanation' => "Speed is the magnitude of velocity and has no direction, so it is a scalar. Velocity, force and electric field intensity all have direction and are vectors."
                ],
                [
                    'id' => 'phy_vec_q10',
                    'text' => 'Which of the following is NOT a vector quantity?',
                    'a' => 'Force',
                    'b' => 'Acceleration',
                    'c' => 'Weight',
                    'd' => 'Distance',
                    'correct_option' => 'D',
                    'explanation' => "Distance is the total path length travelled and has no direction, so it is a scalar. Its vector counterpart is displacement. Weight is a force (W = mg, directed downward), so it is a vector."
                ],
                [
                    'id' => 'phy_vec_q11',
                    'text' => 'Which of the following is a vector quantity?',
                    'a' => 'Force',
                    'b' => 'Altitude',
                    'c' => 'Mass',
                    'd' => 'Distance',
                    'correct_option' => 'A',
                    'explanation' => "Force needs a direction as well as a magnitude. Altitude, mass and distance are scalars."
                ],
                [
                    'id' => 'phy_vec_q12',
                    'text' => 'Which of the following is a scalar quantity?',
                    'a' => 'Force',
                    'b' => 'Altitude',
                    'c' => 'Weight',
                    'd' => 'Displacement',
                    'correct_option' => 'B',
                    'explanation' => "Altitude (height) is given by a number and unit alone. Force, weight and displacement are vectors."
                ],
                [
                    'id' => 'phy_vec_q13',
                    'text' => 'Which of the following is a set of vectors?',
                    'a' => 'Force, mass and moment',
                    'b' => 'Acceleration, velocity and momentum',
                    'c' => 'Mass, weight and density',
                    'd' => 'Mass, moment and density',
                    'correct_option' => 'B',
                    'explanation' => "Acceleration, velocity and momentum (p = mv) are all vectors. Mass and density are scalars, which rules out A, C and D. Weight is a vector, but C also contains mass and density."
                ],
                [
                    'id' => 'phy_vec_q14',
                    'text' => 'Which of the following are vector quantities? I. Speed II. Displacement III. Acceleration IV. Force V. Electric field intensity',
                    'a' => 'I, II and III only',
                    'b' => 'II, III and IV only',
                    'c' => 'III, IV and V only',
                    'd' => 'II, III, IV and V only',
                    'correct_option' => 'D',
                    'explanation' => "Speed (I) is a scalar. Displacement, acceleration, force and electric field intensity (II–V) are vectors. A includes speed, and B and C each leave out vectors."
                ],
                [
                    'id' => 'phy_vec_q15',
                    'text' => 'Which of the following is a set of scalars only?',
                    'a' => 'Density, capacitance, mass',
                    'b' => 'Force, mass, density',
                    'c' => 'Velocity, speed, mass',
                    'd' => 'Displacement, energy, temperature',
                    'correct_option' => 'A',
                    'explanation' => "Density, capacitance and mass are all described by magnitude alone. The other sets each include a vector: force in B, velocity in C, and displacement in D."
                ],
                [
                    'id' => 'phy_vec_q16',
                    'text' => 'Which of the following physical quantities is a vector?',
                    'a' => 'displacement',
                    'b' => 'current',
                    'c' => 'work',
                    'd' => 'area',
                    'correct_option' => 'A',
                    'explanation' => "Displacement is the straight-line change in position, with a direction.\n- Work is the dot product F · d, which is a scalar.\n- Electric current has a direction along the wire, but it does not obey vector addition (currents at a junction add arithmetically), so it is treated as a scalar. Current density is a vector.\n- Area is treated as a scalar at this level, though in advanced work an \"area vector\" appears."
                ]
            ];

            foreach ($questions as $q) {
                $chk = $pdo->prepare("SELECT id FROM questions WHERE id = ? OR (topic_id = ? AND text = ?) LIMIT 1");
                $chk->execute([$q['id'], $topicId, $q['text']]);
                $existing = $chk->fetch();

                if (!$existing) {
                    $insertQ = $pdo->prepare("INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation, bank_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'past')");
                    $insertQ->execute([$q['id'], $topicId, $q['text'], $q['a'], $q['b'], $q['c'], $q['d'], $q['correct_option'], $q['explanation']]);
                } else {
                    $updQ = $pdo->prepare("UPDATE questions SET text = ?, a = ?, b = ?, c = ?, d = ?, correct_option = ?, explanation = ?, bank_type = 'past' WHERE id = ?");
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
            error_log("Failed to seed vectors and scalars questions: " . $e->getMessage());
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
