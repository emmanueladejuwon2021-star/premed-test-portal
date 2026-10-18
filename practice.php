<?php
/**
 * Past Question Practice - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
 */

require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$pageTitle = 'Past Question Practice';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

// Fetch all available courses with Single Source of Truth live past question count
$courses = getCourseListWithCounts($db);
foreach ($courses as &$c) {
    $c['q_count'] = $c['past_q_count'];
}
unset($c);

$selectedCourseId = $_GET['course_id'] ?? ($courses[0]['id'] ?? '');

// Fetch topics for the selected course with Single Source of Truth live past question count
$topics = [];
$totalCourseQuestions = 0;
if (!empty($selectedCourseId)) {
    $topics = getTopicListWithCounts($db, $selectedCourseId);
    foreach ($topics as &$t) {
        $t['q_count'] = $t['past_q_count'];
        $totalCourseQuestions += (int)$t['q_count'];
    }
    unset($t);
}

$currentCourse = null;
foreach ($courses as $c) {
    if ($c['id'] === $selectedCourseId) {
        $currentCourse = $c;
        break;
    }
}
?>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

    <!-- Header -->
    <div class="pb-3.5 border-b border-teal-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Past Question Practice</h1>
            <p class="text-xs text-slate-500 mt-0.5">Customize your practice session across accredited past questions bank with interactive Study or Mock modes.</p>
        </div>
        <span class="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            Past Questions Bank
        </span>
    </div>

    <form method="GET" action="exam.php" id="practiceForm" class="space-y-6" onsubmit="handleFormSubmit(event)">
        <input type="hidden" name="mode" value="practice">
        <input type="hidden" name="new" value="1">

        <div class="grid grid-cols-1 md:grid-cols-12 gap-5">

            <!-- LEFT COLUMN: Choose Course & Settings (5 cols) -->
            <div class="md:col-span-5 space-y-4">

                <!-- Step 1: Select Practice Mode (Study vs Mock) -->
                <div class="bg-white rounded-3xl p-5 border border-teal-100 shadow-xs space-y-3">
                    <label class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <i data-lucide="compass" class="w-4 h-4 text-teal-600"></i>
                        <span>Step 1: Practice Mode</span>
                    </label>

                    <div class="grid grid-cols-2 gap-3">
                        <!-- Study Mode Option -->
                        <label class="relative flex flex-col p-3 rounded-2xl border cursor-pointer transition-all border-teal-200 hover:border-teal-400 has-[:checked]:bg-teal-50/90 has-[:checked]:border-teal-500 has-[:checked]:ring-1 has-[:checked]:ring-teal-400/30">
                            <input type="radio" name="practice_mode" value="study" checked class="sr-only" onchange="updateModeInfo()">
                            <div class="flex items-center gap-1.5 mb-1">
                                <i data-lucide="book-open-check" class="w-4 h-4 text-teal-600"></i>
                                <span class="text-xs font-black text-slate-900">Study Mode</span>
                            </div>
                            <span class="text-[10px] text-slate-500 leading-snug">Untimed. Immediate corrections &amp; detailed explanations per item.</span>
                        </label>

                        <!-- Mock Mode Option -->
                        <label class="relative flex flex-col p-3 rounded-2xl border cursor-pointer transition-all border-slate-200 hover:border-teal-300 has-[:checked]:bg-indigo-50/80 has-[:checked]:border-indigo-500 has-[:checked]:ring-1 has-[:checked]:ring-indigo-400/30">
                            <input type="radio" name="practice_mode" value="mock" class="sr-only" onchange="updateModeInfo()">
                            <div class="flex items-center gap-1.5 mb-1">
                                <i data-lucide="timer" class="w-4 h-4 text-indigo-600"></i>
                                <span class="text-xs font-black text-slate-900">Mock Mode</span>
                            </div>
                            <span class="text-[10px] text-slate-500 leading-snug">Self-paced timing. Answers hidden until full submission.</span>
                        </label>
                    </div>
                </div>

                <!-- Step 2: Select Course -->
                <div class="bg-white rounded-3xl p-5 border border-teal-100 shadow-xs space-y-3">
                    <label class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <i data-lucide="book-open" class="w-4 h-4 text-teal-600"></i>
                        <span>Step 2: Choose Course</span>
                    </label>

                    <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
                        <?php foreach ($courses as $c): 
                            $isSelected = ($c['id'] === $selectedCourseId);
                        ?>
                        <label class="flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all <?= $isSelected ? 'border-teal-500 bg-teal-50/70 shadow-xs ring-1 ring-teal-400/20' : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50' ?>">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <input type="radio" name="course_id" value="<?= htmlspecialchars($c['id']) ?>" <?= $isSelected ? 'checked' : '' ?> onchange="window.location.href='practice.php?course_id=' + this.value" class="text-teal-600 focus:ring-teal-500">
                                <div class="min-w-0">
                                    <span class="block text-xs font-black text-slate-900 leading-tight font-mono"><?= htmlspecialchars($c['code']) ?></span>
                                    <span class="block text-[11px] text-slate-500 truncate leading-tight mt-0.5"><?= htmlspecialchars($c['title']) ?></span>
                                </div>
                            </div>
                            <span class="text-[10px] font-bold text-teal-800 shrink-0 ml-2 bg-white px-2 py-0.5 rounded-lg border border-teal-100 font-mono"><?= (int)$c['q_count'] ?> Qs</span>
                        </label>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- Step 3: Question Quantity Limit Controls -->
                <div class="bg-white rounded-3xl p-5 border border-teal-100 shadow-xs space-y-3">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <i data-lucide="sliders" class="w-4 h-4 text-teal-600"></i>
                            <span>Step 3: Question Quantity</span>
                        </label>
                        <span class="text-[11px] text-slate-400 font-mono font-bold" id="maxAvailBadge">Max: <?= $totalCourseQuestions ?> Qs</span>
                    </div>

                    <!-- Radio Presets -->
                    <div class="grid grid-cols-4 gap-2">
                        <?php foreach ([10 => '10', 20 => '20', 30 => '30', 50 => '50'] as $lim => $label): ?>
                        <label class="text-center p-2.5 rounded-2xl border border-slate-200 hover:border-teal-400 cursor-pointer has-[:checked]:bg-teal-600 has-[:checked]:text-white has-[:checked]:border-teal-600 transition-all shadow-xs">
                            <input type="radio" name="preset_limit" value="<?= $lim ?>" <?= $lim === 20 ? 'checked' : '' ?> onchange="handlePresetSelect(this)" class="sr-only">
                            <span class="block text-xs font-black"><?= $label ?></span>
                            <span class="block text-[9px] uppercase font-bold opacity-80">Items</span>
                        </label>
                        <?php endforeach; ?>
                    </div>

                    <!-- Custom Quantity Input -->
                    <div class="pt-2 border-t border-slate-100 space-y-1.5">
                        <div class="flex items-center justify-between text-xs">
                            <span class="font-bold text-slate-700">Or Custom Quantity:</span>
                            <span class="text-[10px] text-slate-400">Cap automatically enforced</span>
                        </div>
                        <div class="relative">
                            <input type="number" id="customLimitInput" min="1" max="<?= $totalCourseQuestions ?>" placeholder="e.g. 15 or 45" oninput="handleCustomInput(this)" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none">
                            <span class="absolute right-3 top-2.5 text-[10px] font-mono font-bold text-slate-400">Questions</span>
                        </div>
                    </div>

                    <input type="hidden" name="limit" id="finalLimitInput" value="20">
                </div>

            </div>

            <!-- RIGHT COLUMN: Choose Topics (7 cols) -->
            <div class="md:col-span-7">
                <div class="bg-white rounded-3xl p-5 sm:p-6 border border-teal-100 shadow-xs space-y-4">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <label class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <i data-lucide="layers" class="w-4 h-4 text-teal-600"></i>
                                <span>Step 4: Select Topics</span>
                            </label>
                            <p class="text-xs text-slate-500 mt-0.5">Choose specific modules or practice across the entire syllabus.</p>
                        </div>

                        <button type="button" onclick="toggleAllTopics()" id="selectAllBtn" class="text-xs font-bold text-teal-600 hover:text-teal-800 hover:underline">
                            Select All
                        </button>
                    </div>

                    <?php if (empty($topics)): ?>
                    <div class="py-12 text-center text-slate-400 text-xs">
                        No topics found for this course yet.
                    </div>
                    <?php else: ?>
                    <div class="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        <!-- Option: All Topics -->
                        <label class="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-teal-300 hover:bg-slate-50 cursor-pointer transition-all has-[:checked]:bg-teal-50 has-[:checked]:border-teal-400">
                            <div class="flex items-center gap-3">
                                <input type="checkbox" name="topic_ids[]" value="ALL" checked id="checkboxAll" onchange="handleAllCheckboxChange(this)" class="w-4 h-4 text-teal-600 rounded focus:ring-teal-500">
                                <div>
                                    <span class="block text-xs font-black text-slate-900">All Topics Combined</span>
                                    <span class="block text-[11px] text-slate-500">Random practice questions across the syllabus</span>
                                </div>
                            </div>
                            <span class="text-xs font-bold text-teal-700 font-mono"><?= $totalCourseQuestions ?> Qs</span>
                        </label>

                        <!-- Individual Topics -->
                        <?php foreach ($topics as $t): ?>
                        <label class="topic-label flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-teal-200 hover:bg-slate-50 cursor-pointer transition-all has-[:checked]:bg-teal-50/60 has-[:checked]:border-teal-300">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <input type="checkbox" name="topic_ids[]" value="<?= htmlspecialchars($t['id']) ?>" onchange="handleIndividualCheckboxChange(this)" class="topic-checkbox w-4 h-4 text-teal-600 rounded focus:ring-teal-500" data-qcount="<?= (int)$t['q_count'] ?>">
                                <span class="text-xs font-semibold text-slate-800 truncate"><?= htmlspecialchars($t['name']) ?></span>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 shrink-0 ml-2 font-mono"><?= (int)$t['q_count'] ?> Qs</span>
                        </label>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

        </div>

        <!-- Submit Launch Bar -->
        <div class="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white rounded-3xl p-5 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div class="flex items-center gap-3 text-xs">
                <div class="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center font-bold">
                    <i data-lucide="play" class="w-5 h-5"></i>
                </div>
                <div>
                    <span class="font-black text-white text-sm block">Subject: <?= htmlspecialchars($currentCourse['code'] ?? 'Select Course') ?></span>
                    <span class="text-xs text-slate-300" id="launchBarSubtitle">Study Mode: Untimed practice with instant step-by-step KaTeX solutions</span>
                </div>
            </div>

            <button type="submit" class="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-teal-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                <span>Start Practice</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
        </div>
    </form>

</div>

<script>
    const totalMaxQuestions = <?= (int)$totalCourseQuestions ?>;

    function updateModeInfo() {
        const modeEl = document.querySelector('input[name="practice_mode"]:checked');
        const mode = modeEl ? modeEl.value : 'study';
        const sub = document.getElementById('launchBarSubtitle');
        if (sub) {
            if (mode === 'study') {
                sub.innerText = "Study Mode: Untimed practice with locked options & instant KaTeX explanations";
            } else {
                sub.innerText = "Mock Mode: Self-paced timing. Full score summary & corrections upon submission";
            }
        }
    }

    function calculateAvailableQuestions() {
        const allBox = document.getElementById('checkboxAll');
        if (allBox && allBox.checked) {
            return totalMaxQuestions;
        }

        let total = 0;
        document.querySelectorAll('.topic-checkbox:checked').forEach(cb => {
            total += parseInt(cb.getAttribute('data-qcount') || '0', 10);
        });
        return total > 0 ? total : totalMaxQuestions;
    }

    function handlePresetSelect(radio) {
        const customInput = document.getElementById('customLimitInput');
        if (customInput) customInput.value = '';

        const finalInput = document.getElementById('finalLimitInput');
        const maxAvail = calculateAvailableQuestions();
        let requested = parseInt(radio.value, 10);

        if (requested > maxAvail && maxAvail > 0) {
            requested = maxAvail;
        }
        if (finalInput) finalInput.value = requested;
    }

    function handleCustomInput(input) {
        // Uncheck all preset radios when typing custom limit
        document.querySelectorAll('input[name="preset_limit"]').forEach(r => r.checked = false);

        const finalInput = document.getElementById('finalLimitInput');
        const maxAvail = calculateAvailableQuestions();
        let val = parseInt(input.value, 10);

        if (isNaN(val) || val <= 0) {
            val = 20;
        } else if (val > maxAvail && maxAvail > 0) {
            val = maxAvail;
            input.value = maxAvail;
        }

        if (finalInput) finalInput.value = val;
    }

    function handleAllCheckboxChange(allBox) {
        if (allBox.checked) {
            document.querySelectorAll('.topic-checkbox').forEach(cb => {
                cb.checked = false;
            });
        }
        updateQuantityCap();
    }

    function handleIndividualCheckboxChange(indBox) {
        const allBox = document.getElementById('checkboxAll');
        if (indBox.checked && allBox) {
            allBox.checked = false;
        }
        updateQuantityCap();
    }

    function toggleAllTopics() {
        const allBox = document.getElementById('checkboxAll');
        if (allBox) {
            allBox.checked = true;
            handleAllCheckboxChange(allBox);
        }
    }

    function updateQuantityCap() {
        const maxAvail = calculateAvailableQuestions();
        const badge = document.getElementById('maxAvailBadge');
        if (badge) badge.innerText = `Max: ${maxAvail} Qs`;

        const customInput = document.getElementById('customLimitInput');
        if (customInput) customInput.max = maxAvail;

        const presetSelected = document.querySelector('input[name="preset_limit"]:checked');
        if (presetSelected) {
            handlePresetSelect(presetSelected);
        } else if (customInput && customInput.value) {
            handleCustomInput(customInput);
        }
    }

    function handleFormSubmit(e) {
        const finalInput = document.getElementById('finalLimitInput');
        const maxAvail = calculateAvailableQuestions();
        if (finalInput) {
            let cur = parseInt(finalInput.value, 10);
            if (isNaN(cur) || cur <= 0) cur = 20;
            if (cur > maxAvail && maxAvail > 0) cur = maxAvail;
            finalInput.value = cur;
        }
    }

    window.addEventListener('DOMContentLoaded', updateModeInfo);
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
