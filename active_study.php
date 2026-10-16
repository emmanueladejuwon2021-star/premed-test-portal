<?php
/**
 * AI Active Study Lab - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
 * Status: LOCKED BY FACULTY ADMINISTRATION
 */

$pageTitle = 'Study Room (Locked)';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

    <!-- 1. Faculty Lockdown Banner -->
    <div class="bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-xl text-white relative overflow-hidden">
        <div class="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
            <div class="flex items-start gap-4">
                <div class="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                    <i data-lucide="lock" class="w-7 h-7"></i>
                </div>
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 font-mono text-[10px] font-black uppercase tracking-wider">
                            Faculty Restricted
                        </span>
                        <span class="text-xs text-slate-400 font-semibold">&bull; Active CBT Window</span>
                    </div>
                    <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">AI Clinical Study Room is Locked</h1>
                    <p class="text-xs text-slate-300 leading-relaxed max-w-xl mt-1">
                        Access to automated AI note synthesis, diagnostic conversational tutors, and real-time query resolution is temporarily restricted by the faculty administration to ensure the academic integrity of ongoing competitive evaluations.
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- 2. Permitted Alternative Study Modules -->
    <div class="space-y-4">
        <div>
            <h2 class="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
                <span>Authorized Study &amp; Evaluation Options</span>
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">You can continue preparing through verified syllabus question banks and timed mock assessments.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <!-- Card 1: Active Tests -->
            <a href="courses.php" class="p-5 rounded-3xl bg-white border border-teal-100 hover:border-teal-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
                <div class="space-y-2">
                    <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <i data-lucide="file-check-2" class="w-5 h-5"></i>
                    </div>
                    <h3 class="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">Active Tests &amp; Exams</h3>
                    <p class="text-xs text-slate-500 leading-relaxed">Sit for official timed evaluations scheduled for your pre-medical department.</p>
                </div>
                <span class="inline-flex items-center gap-1 text-xs font-bold text-teal-600 font-mono">
                    <span>Enter Tests</span>
                    <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                </span>
            </a>

            <!-- Card 2: Past Question Practice -->
            <a href="practice.php" class="p-5 rounded-3xl bg-white border border-teal-100 hover:border-teal-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
                <div class="space-y-2">
                    <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <i data-lucide="layers" class="w-5 h-5"></i>
                    </div>
                    <h3 class="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">Past Question Practice</h3>
                    <p class="text-xs text-slate-500 leading-relaxed">Self-paced practice covering physics, chemistry, and biology with full solutions.</p>
                </div>
                <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 font-mono">
                    <span>Practice Now</span>
                    <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                </span>
            </a>

            <!-- Card 3: Academic Question Search -->
            <a href="question_search.php" class="p-5 rounded-3xl bg-white border border-teal-100 hover:border-teal-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
                <div class="space-y-2">
                    <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <i data-lucide="book-open-check" class="w-5 h-5"></i>
                    </div>
                    <h3 class="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">Academic Search</h3>
                    <p class="text-xs text-slate-500 leading-relaxed">Search through thousands of verified past questions and worked formulas.</p>
                </div>
                <span class="inline-flex items-center gap-1 text-xs font-bold text-teal-600 font-mono">
                    <span>Search Library</span>
                    <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                </span>
            </a>

        </div>
    </div>

    <!-- 3. Preview of Locked AI Study Features -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4 opacity-75 relative">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-700">Restricted Engine Capabilities</h3>
            </div>
            <span class="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <i data-lucide="lock" class="w-3 h-3"></i> Locked Feature
            </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs text-slate-600">
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <div class="font-bold text-slate-900 flex items-center gap-1.5">
                    <i data-lucide="bot" class="w-4 h-4 text-slate-400"></i>
                    <span>Conversational Clinical Tutor</span>
                </div>
                <p class="text-[11px] text-slate-500">Interactive dialogue explaining biological mechanisms and physical formulas.</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <div class="font-bold text-slate-900 flex items-center gap-1.5">
                    <i data-lucide="file-text" class="w-4 h-4 text-slate-400"></i>
                    <span>Lecture Note Ingestion</span>
                </div>
                <p class="text-[11px] text-slate-500">Automated extraction of high-yield exam takeaways from lecture slides.</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <div class="font-bold text-slate-900 flex items-center gap-1.5">
                    <i data-lucide="help-circle" class="w-4 h-4 text-slate-400"></i>
                    <span>Synthetic Drill Generator</span>
                </div>
                <p class="text-[11px] text-slate-500">Customized comprehension quizzes generated from specific reading assignments.</p>
            </div>
        </div>

        <p class="text-[11px] text-slate-400 text-center pt-2">
            This module will be automatically re-enabled following the conclusion of the active testing cycle.
        </p>
    </div>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
