<?php
/**
 * Student Home Dashboard - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
 */

require_once __DIR__ . '/config/db.php';

$db = DB::connect();

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$studentId = $_SESSION['student']['id'] ?? '';

// Handle Direct AJAX/POST Bank Details Update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'update_bank') {
    $accountNumber = trim($_POST['account_number'] ?? '');
    $bank = trim($_POST['bank'] ?? '');
    $accountName = trim($_POST['account_name'] ?? '');

    header('Content-Type: application/json');
    if (empty($accountNumber) || !preg_match('/^[0-9]{10,12}$/', $accountNumber)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Account Number is required and must be 10-12 digits.']);
        exit;
    } elseif (empty($bank) || mb_strlen($bank) < 2) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Bank is required and must be selected from the approved list.']);
        exit;
    } elseif (empty($accountName) || mb_strlen($accountName) < 3) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Full Account Name is required and must be at least 3 characters.']);
        exit;
    } else {
        try {
            $upStmt = $db->prepare("UPDATE students SET account_number = ?, bank = ?, account_name = ? WHERE id = ?");
            $upStmt->execute([$accountNumber, $bank, $accountName, $studentId]);

            // Refresh session & serverless auth cookie
            $freshStmt = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
            $freshStmt->execute([$studentId]);
            $updatedStudent = $freshStmt->fetch();
            if ($updatedStudent) {
                $_SESSION['student'] = $updatedStudent;
                set_student_auth_cookie($updatedStudent);
                session_write_close();
            }

            echo json_encode(['ok' => true, 'message' => 'Banking details successfully verified and saved!']);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Failed to save banking details: ' . $e->getMessage()]);
            exit;
        }
    }
}

// Ensure $student in session has latest data from database
$freshStudentStmt = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
$freshStudentStmt->execute([$studentId]);
$freshStudent = $freshStudentStmt->fetch();
if ($freshStudent) {
    $_SESSION['student'] = $freshStudent;
}
$student = $_SESSION['student'];
$accNum = trim($student['account_number'] ?? '');
$accBank = trim($student['bank'] ?? '');
$accName = trim($student['account_name'] ?? '');
$needsBankDetails = (empty($accNum) || empty($accBank) || empty($accName));

$pageTitle = 'Home';
require_once __DIR__ . '/includes/header.php';

// Student test stats
$statsStmt = $db->prepare("
    SELECT 
        COUNT(id) as total_tests,
        COALESCE(AVG(percentage), 0) as avg_score,
        COALESCE(MAX(percentage), 0) as max_score
    FROM results 
    WHERE student_id = ?
");
$statsStmt->execute([$studentId]);
$stats = $statsStmt->fetch() ?: ['total_tests' => 0, 'avg_score' => 0, 'max_score' => 0];

// Check if any test is currently live
$examStmt = $db->query("
    SELECT t.*, c.code AS course_code, c.title AS course_title 
    FROM tests t
    JOIN courses c ON t.course_id = c.id
    WHERE t.is_live = 1 
    ORDER BY t.created_at DESC 
    LIMIT 1
");
$liveTest = $examStmt ? $examStmt->fetch() : null;

// Fallback to active unlocked courses with questions if no explicit test is scheduled
if (!$liveTest) {
    $coursesList = getCourseListWithCounts($db);
    $unlockedCourse = null;
    foreach ($coursesList as $c) {
        if (empty($c['is_locked']) && (int)$c['questions_count'] > 0) {
            $unlockedCourse = $c;
            break;
        }
    }
    if ($unlockedCourse) {
        $liveTest = [
            'id' => null,
            'course_id' => $unlockedCourse['id'],
            'course_code' => $unlockedCourse['code'],
            'title' => $unlockedCourse['title'] . ' Official Assessment',
            'duration' => 30,
            'question_limit' => min(30, (int)$unlockedCourse['questions_count']),
            'is_course_exam' => true
        ];
    }
}

// Recent 5 test results
$recentStmt = $db->prepare("
    SELECT r.*, c.code AS course_code, c.title AS course_title 
    FROM results r
    LEFT JOIN courses c ON r.course_id = c.id
    WHERE r.student_id = ?
    ORDER BY r.created_at DESC 
    LIMIT 5
");
$recentStmt->execute([$studentId]);
$recentTests = $recentStmt->fetchAll();

$firstName = htmlspecialchars(explode(' ', $student['name'] ?? 'Student')[0]);
?>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

    <?php if ($needsBankDetails): ?>
    <!-- Bank Details Required Alert Banner -->
    <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-teal-500/10 border border-amber-300/40 text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div class="flex items-start sm:items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <i data-lucide="award" class="w-5 h-5"></i>
            </div>
            <div>
                <h4 class="text-xs font-black uppercase tracking-wider text-amber-900">Bank Details Required for Cash Prizes & Verification</h4>
                <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">Top scorers receive cash awards directly into their bank account. Please link your account number now.</p>
            </div>
        </div>
        <button type="button" onclick="document.getElementById('bankModal').classList.remove('hidden')" class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider shrink-0 shadow-sm transition-all flex items-center gap-2">
            <i data-lucide="credit-card" class="w-4 h-4"></i>
            <span>Complete Bank Details</span>
        </button>
    </div>
    <?php endif; ?>

    <!-- 1. Clinical Welcome Hero Banner -->
    <div class="bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-teal-500/20 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        <!-- Glowing Orb Accents -->
        <div class="absolute -right-12 -top-12 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-12 -bottom-12 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="space-y-2 max-w-xl relative z-10">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/10 border border-teal-400/30 text-teal-200 text-xs font-semibold backdrop-blur-md">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>ID: <?= htmlspecialchars($student['matric_no'] ?? '') ?></span>
                <span class="text-teal-400">&bull;</span>
                <span class="truncate max-w-[200px]"><?= htmlspecialchars($student['department'] ?? 'Pre-Medical Sciences') ?></span>
            </div>
            
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Welcome back, <?= $firstName ?>! 👋
            </h1>
            
            <p class="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Your medical CBT examination portal is ready. Take proctored tests, practice past questions with detailed solutions, or review notes in the study lab.
            </p>
        </div>

        <!-- 3 Performance Capsules -->
        <div class="grid grid-cols-3 gap-2.5 sm:gap-3 w-full md:w-auto relative z-10 shrink-0">
            <div class="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
                <span class="block text-xl sm:text-2xl font-black text-white font-mono"><?= (int)$stats['total_tests'] ?></span>
                <span class="text-[10px] sm:text-[11px] text-teal-200 font-bold uppercase tracking-wider">Tests</span>
            </div>
            <div class="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
                <span class="block text-xl sm:text-2xl font-black text-teal-300 font-mono"><?= round((float)$stats['avg_score']) ?>%</span>
                <span class="text-[10px] sm:text-[11px] text-teal-200 font-bold uppercase tracking-wider">Average</span>
            </div>
            <div class="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
                <span class="block text-xl sm:text-2xl font-black text-emerald-400 font-mono"><?= round((float)$stats['max_score']) ?>%</span>
                <span class="text-[10px] sm:text-[11px] text-emerald-200 font-bold uppercase tracking-wider">Peak</span>
            </div>
        </div>

    </div>

    <!-- 2. Active Test Alert (If Live Test Exists) -->
    <?php if ($liveTest): ?>
    <div class="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-2 border-teal-400/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-600/20">
                <i data-lucide="radio" class="w-6 h-6 animate-pulse"></i>
            </div>
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-[10px] font-black uppercase tracking-wider text-teal-900 bg-teal-200/60 px-2 py-0.5 rounded-md">Live Examination Open</span>
                    <span class="text-xs font-mono font-bold text-teal-800"><?= htmlspecialchars($liveTest['course_code']) ?></span>
                </div>
                <h3 class="text-base font-extrabold text-slate-900"><?= htmlspecialchars($liveTest['title']) ?></h3>
                <p class="text-xs text-slate-600 mt-0.5">
                    Duration: <?= (int)$liveTest['duration'] ?> minutes &bull; Item Volume: <?= (int)$liveTest['question_limit'] ?> questions
                </p>
            </div>
        </div>

        <?php $examUrl = !empty($liveTest['id']) ? 'exam.php?test_id=' . urlencode($liveTest['id']) : 'exam.php?course_id=' . urlencode($liveTest['course_id']); ?>
        <a href="<?= $examUrl ?>" class="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95">
            <span>Enter Exam Room</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
    </div>
    <?php endif; ?>

    <!-- 3. Quick Action Cards (6 Features) -->
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <i data-lucide="compass" class="w-4 h-4 text-teal-600"></i>
                <span>Navigation &amp; Study Modules</span>
            </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <!-- Card 1: Past Question Practice -->
            <a href="practice.php" class="group bg-white hover:bg-teal-50/40 border border-teal-100 hover:border-teal-400 p-5 rounded-3xl transition-all shadow-xs hover:shadow-md flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <i data-lucide="layers" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">Past Question Practice</h3>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">Practice authentic university physics, chemistry and biology questions topic by topic.</p>
                </div>
            </a>

            <!-- Card 2: Tests -->
            <a href="courses.php" class="group bg-white hover:bg-teal-50/40 border border-teal-100 hover:border-teal-400 p-5 rounded-3xl transition-all shadow-xs hover:shadow-md flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <i data-lucide="file-check-2" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">Tests &amp; Exams</h3>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">Access scheduled timed tests, mock examinations, and topic test banks.</p>
                </div>
            </a>

            <!-- Card 3: Study Room (Locked) -->
            <a href="active_study.php" class="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-amber-300 p-5 rounded-3xl transition-all shadow-xs hover:shadow-md flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <i data-lucide="lock" class="w-6 h-6"></i>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h3 class="text-sm font-black text-slate-900 group-hover:text-amber-800 transition-colors">AI Study Lab</h3>
                        <span class="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">Locked</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">AI Clinical Tutor is currently locked during active examinations. Focus on official tests &amp; past questions.</p>
                </div>
            </a>

            <!-- Card 4: Academic Resources -->
            <a href="question_search.php" class="group bg-white hover:bg-teal-50/40 border border-teal-100 hover:border-teal-400 p-5 rounded-3xl transition-all shadow-xs hover:shadow-md flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <i data-lucide="book-open-check" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">Academic Resources</h3>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">Instantly search question stems, equations, scientific symbols and solutions.</p>
                </div>
            </a>

            <!-- Card 5: Results -->
            <a href="history.php" class="group bg-white hover:bg-teal-50/40 border border-teal-100 hover:border-teal-400 p-5 rounded-3xl transition-all shadow-xs hover:shadow-md flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <i data-lucide="bar-chart-3" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">My Test Results</h3>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">Analyze performance breakdowns, review marked answers, and track grade trends.</p>
                </div>
            </a>

            <!-- Card 6: My Profile -->
            <a href="profile.php" class="group bg-white hover:bg-teal-50/40 border border-teal-100 hover:border-teal-400 p-5 rounded-3xl transition-all shadow-xs hover:shadow-md flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <i data-lucide="user-check" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">Candidate Profile</h3>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">View registered department, matriculation identity, and system session details.</p>
                </div>
            </a>

        </div>
    </div>

    <!-- 4. Recent Test Submissions -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 border border-teal-100 shadow-sm space-y-4">
        <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div>
                <h2 class="text-sm sm:text-base font-black text-slate-900">Recent Test Submissions</h2>
                <p class="text-xs text-slate-500 mt-0.5">Your official examination scores and logs</p>
            </div>
            <a href="history.php" class="text-xs font-bold text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1">
                <span>View Full History</span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </a>
        </div>

        <?php if (empty($recentTests)): ?>
        <div class="py-10 text-center text-slate-400 space-y-2.5">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <i data-lucide="clipboard-check" class="w-6 h-6"></i>
            </div>
            <p class="text-xs font-medium text-slate-600">No examination attempts on record yet.</p>
            <a href="courses.php" class="inline-block px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors">
                Browse Available Tests
            </a>
        </div>
        <?php else: ?>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead>
                    <tr class="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th class="py-3 pr-4">Course</th>
                        <th class="py-3 px-4">Date</th>
                        <th class="py-3 px-4 text-center">Score</th>
                        <th class="py-3 px-4 text-center">Percentage</th>
                        <th class="py-3 px-4 text-center">Grade</th>
                        <th class="py-3 pl-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php foreach ($recentTests as $r): ?>
                    <tr class="hover:bg-teal-50/30 transition-colors">
                        <td class="py-3.5 pr-4 font-bold text-slate-800">
                            <span class="inline-block px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200/50 text-teal-800 font-mono text-[11px] mr-2">
                                <?= htmlspecialchars($r['course_code']) ?>
                            </span>
                            <span><?= htmlspecialchars($r['course_title']) ?></span>
                        </td>
                        <td class="py-3.5 px-4 text-slate-500">
                            <?= date('M d, Y', strtotime($r['created_at'])) ?>
                        </td>
                        <td class="py-3.5 px-4 text-center font-bold text-slate-700 font-mono">
                            <?= (int)$r['total_score'] ?> / <?= (int)$r['total_questions'] ?>
                        </td>
                        <td class="py-3.5 px-4 text-center font-black text-teal-600 font-mono text-sm">
                            <?= round((float)$r['percentage'], 1) ?>%
                        </td>
                        <td class="py-3.5 px-4 text-center">
                            <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold <?= (float)$r['percentage'] >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ((float)$r['percentage'] >= 50 ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-rose-50 text-rose-700 border border-rose-200') ?>">
                                <?= htmlspecialchars($r['grade'] ?: 'Completed') ?>
                            </span>
                        </td>
                        <td class="py-3.5 pl-4 text-right">
                            <a href="results.php?result_id=<?= urlencode($r['id']) ?>" class="px-3.5 py-1.5 rounded-xl border border-teal-200 hover:bg-teal-50 text-teal-700 font-bold text-xs transition-colors inline-block">
                                Review
                            </a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>
    </div>

</div>

<!-- ================= MODAL: BANKING DETAILS REQUIRED DIALOG ================= -->
<div id="bankModal" class="<?= $needsBankDetails ? '' : 'hidden' ?> fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-teal-100 animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <i data-lucide="award" class="w-6 h-6"></i>
            </div>
            <div>
                <span class="inline-block text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 mb-1">Prizes &amp; Verification</span>
                <h3 class="text-lg font-black text-slate-900 leading-tight">Complete Bank Details</h3>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">Please register your bank account details to enable automated cash prize disbursement and candidate authentication.</p>
            </div>
        </div>

        <!-- Alert Notice -->
        <div class="p-3.5 rounded-2xl bg-teal-50 border border-teal-100 text-teal-800 text-xs flex items-start gap-2.5">
            <i data-lucide="shield-check" class="w-4 h-4 text-teal-600 shrink-0 mt-0.5"></i>
            <span class="text-[11px] leading-relaxed">Your banking credentials are protected and will only be used to process official cash awards for top scorers.</span>
        </div>

        <!-- Form -->
        <form id="bankForm" class="space-y-4">
            <input type="hidden" name="action" value="update_bank">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Account Number (10 Digits) <span class="text-rose-500">*</span></label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="credit-card" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="account_number" id="modalAccountNumber" required maxlength="12" placeholder="e.g. 0123456789" value="<?= htmlspecialchars($student['account_number'] ?? '') ?>" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bank Name <span class="text-rose-500">*</span></label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="building-2" class="w-4 h-4"></i>
                    </span>
                    <select name="bank" id="modalBank" required class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                        <option value="" disabled <?= empty($student['bank']) ? 'selected' : '' ?>>-- Select your Bank --</option>
                        <?php 
                        $bankList = [
                            'Opay', 'PalmPay', 'Kuda Bank', 'Moniepoint', 'SmartCash PSB',
                            'Access Bank', 'GTBank', 'FirstBank', 'Zenith Bank', 'UBA',
                            'Stanbic IBTC', 'Wema Bank', 'FCMB', 'Union Bank', 'Fidelity Bank',
                            'Polaris Bank', 'Sterling Bank', 'Ecobank', 'Keystone Bank',
                            'Unity Bank', 'Providus Bank', 'Jaiz Bank', 'Taj Bank', 'Heritage Bank', 'Other Bank'
                        ];
                        foreach ($bankList as $b): 
                        ?>
                        <option value="<?= $b ?>" <?= ($student['bank'] ?? '') === $b ? 'selected' : '' ?>><?= $b ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Account Name (Full Name on Account) <span class="text-rose-500">*</span></label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="user-check" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="account_name" id="modalAccountName" required minlength="4" placeholder="e.g. Adejuwon Emmanuel" value="<?= htmlspecialchars($student['account_name'] ?? '') ?>" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                </div>
            </div>

            <div id="bankError" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <i data-lucide="alert-circle" class="w-4 h-4 shrink-0"></i>
                <span id="bankErrorText">Failed to save details.</span>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2">
                <button type="button" id="bankCancel" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors">
                    Remind Me Later
                </button>
                <button type="submit" id="bankSubmitBtn" class="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-teal-600/20 transition-all flex items-center gap-2">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    <span id="bankSubmitBtnText">Save Bank Details</span>
                </button>
            </div>
        </form>

    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('bankModal');
    const cancelBtn = document.getElementById('bankCancel');
    const form = document.getElementById('bankForm');
    const errBox = document.getElementById('bankError');
    const errText = document.getElementById('bankErrorText');
    const submitBtn = document.getElementById('bankSubmitBtn');
    const submitText = document.getElementById('bankSubmitBtnText');

    if (cancelBtn && modal) {
        cancelBtn.addEventListener('click', function() {
            modal.classList.add('hidden');
        });
    }

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            errBox.classList.add('hidden');

            const accNum = document.getElementById('modalAccountNumber').value.trim();
            const bank = document.getElementById('modalBank').value;
            const accName = document.getElementById('modalAccountName').value.trim();

            if (!/^[0-9]{10,12}$/.test(accNum)) {
                errText.innerText = 'Account Number must be between 10 and 12 digits.';
                errBox.classList.remove('hidden');
                return;
            }

            if (!bank) {
                errText.innerText = 'Please select your bank.';
                errBox.classList.remove('hidden');
                return;
            }

            if (accName.length < 3) {
                errText.innerText = 'Full Account Name must be at least 3 characters long.';
                errBox.classList.remove('hidden');
                return;
            }

            submitBtn.disabled = true;
            submitText.innerText = 'Saving...';

            const formData = new FormData(form);

            fetch('index.php', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    modal.classList.add('hidden');
                    // Reload to reflect updated session data
                    window.location.reload();
                } else {
                    throw new Error(data.error || 'Failed to save bank details.');
                }
            })
            .catch(err => {
                errText.innerText = err.message || 'An error occurred while saving your details. Please try again.';
                errBox.classList.remove('hidden');
                submitBtn.disabled = false;
                submitText.innerText = 'Save Bank Details';
            });
        });
    }

    if (window.lucide) {
        lucide.createIcons();
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
