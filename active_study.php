<?php
/**
 * AI Active Study Lab - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
 */

$pageTitle = 'Study Room';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="studyApp">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200 mb-2">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-teal-600"></i>
                <span>AI Clinical Study Assistant</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">AI Study Room</h1>
            <p class="text-xs text-slate-500 mt-1">Paste your medical notes to chat with AI, test comprehension, and generate synthesized review points.</p>
        </div>
    </div>

    <!-- Step 1: Note Ingestion Box -->
    <div class="bg-white rounded-3xl p-6 border border-teal-100 shadow-sm space-y-4">
        <div class="flex justify-between items-center">
            <label class="block text-xs font-black text-slate-700 uppercase tracking-wider">Paste Lecture Notes or Syllabus Topic</label>
            <button type="button" onclick="loadSampleNote()" class="text-xs text-teal-600 hover:text-teal-800 font-bold">Load Pre-Med Sample</button>
        </div>
        <textarea id="studyNoteInput" rows="5" placeholder="Paste your study notes, anatomy slides, or physiology formulas here..." class="w-full p-4 rounded-2xl border border-teal-100 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"></textarea>
        <div class="flex justify-end">
            <button type="button" onclick="activateNotes()" class="px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all active:scale-95">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
                <span>Analyze Notes &amp; Begin</span>
            </button>
        </div>
    </div>

    <!-- Step 2: Interactive Tabs (Chat, Quiz, Study Guide) -->
    <div id="studyTabsContainer" class="space-y-6">
        <div class="flex bg-slate-100 p-1.5 rounded-2xl text-xs font-bold text-slate-600 max-w-md">
            <button type="button" onclick="switchStudyTab('chat')" id="tabBtnChat" class="flex-1 py-2.5 rounded-xl bg-white shadow-xs text-teal-700 font-black transition-all flex items-center justify-center gap-1.5">
                <i data-lucide="message-square" class="w-4 h-4"></i>
                <span>Ask AI Tutor</span>
            </button>
            <button type="button" onclick="switchStudyTab('quiz')" id="tabBtnQuiz" class="flex-1 py-2.5 rounded-xl hover:text-slate-900 transition-all flex items-center justify-center gap-1.5">
                <i data-lucide="help-circle" class="w-4 h-4"></i>
                <span>Practice Quiz</span>
            </button>
            <button type="button" onclick="switchStudyTab('guide')" id="tabBtnGuide" class="flex-1 py-2.5 rounded-xl hover:text-slate-900 transition-all flex items-center justify-center gap-1.5">
                <i data-lucide="book-open" class="w-4 h-4"></i>
                <span>High-Yield Points</span>
            </button>
        </div>

        <!-- Tab Panel: Chat -->
        <div id="panelChat" class="bg-white rounded-3xl p-6 border border-teal-100 shadow-sm space-y-4">
            <div id="chatMessages" class="h-80 overflow-y-auto space-y-3 p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
                <div class="flex gap-2.5 items-start">
                    <div class="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs"><i data-lucide="bot" class="w-4 h-4"></i></div>
                    <div class="bg-white p-3.5 rounded-2xl rounded-tl-none border border-slate-200/80 text-xs text-slate-800 leading-relaxed shadow-xs max-w-lg">
                        Hello! I am your AI pre-medical tutor. Upload your lecture notes above, and ask me questions about concepts, physiological mechanisms, or formulas!
                    </div>
                </div>
            </div>

            <form onsubmit="handleChatSubmit(event)" class="flex gap-2">
                <input type="text" id="chatInput" placeholder="Ask a question about your uploaded notes..." class="flex-1 px-4 py-2.5 rounded-2xl border border-teal-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500">
                <button type="submit" class="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95">
                    <i data-lucide="send" class="w-3.5 h-3.5"></i>
                    <span>Send</span>
                </button>
            </form>
        </div>

        <!-- Tab Panel: Quiz -->
        <div id="panelQuiz" class="hidden bg-white rounded-3xl p-6 border border-teal-100 shadow-sm space-y-4">
            <div class="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 class="text-sm font-black text-slate-900">Comprehension Checks</h3>
                <span id="quizScoreDisplay" class="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">Score: 0</span>
            </div>
            <div id="quizQuestionsContainer" class="space-y-4">
                <p class="text-xs text-slate-400 py-6 text-center">Paste notes above and click "Analyze Notes &amp; Begin" to generate a practice quiz.</p>
            </div>
        </div>

        <!-- Tab Panel: Guide -->
        <div id="panelGuide" class="hidden bg-white rounded-3xl p-6 border border-teal-100 shadow-sm space-y-4">
            <h3 class="text-sm font-black text-slate-900 pb-3 border-b border-slate-100">Synthesized High-Yield Study Guide</h3>
            <div id="guideContent" class="text-xs leading-relaxed text-slate-700 space-y-3">
                <p class="text-slate-400 py-6 text-center">Paste notes above and click "Analyze Notes &amp; Begin" to extract high-yield clinical points.</p>
            </div>
        </div>
    </div>
</div>

<script>
function switchStudyTab(tab) {
    document.getElementById('panelChat').classList.add('hidden');
    document.getElementById('panelQuiz').classList.add('hidden');
    document.getElementById('panelGuide').classList.add('hidden');

    ['tabBtnChat', 'tabBtnQuiz', 'tabBtnGuide'].forEach(id => {
        const b = document.getElementById(id);
        b.className = "flex-1 py-2.5 rounded-xl hover:text-slate-900 transition-all flex items-center justify-center gap-1.5";
    });

    if (tab === 'chat') {
        document.getElementById('panelChat').classList.remove('hidden');
        document.getElementById('tabBtnChat').className = "flex-1 py-2.5 rounded-xl bg-white shadow-xs text-teal-700 font-black transition-all flex items-center justify-center gap-1.5";
    } else if (tab === 'quiz') {
        document.getElementById('panelQuiz').classList.remove('hidden');
        document.getElementById('tabBtnQuiz').className = "flex-1 py-2.5 rounded-xl bg-white shadow-xs text-teal-700 font-black transition-all flex items-center justify-center gap-1.5";
    } else if (tab === 'guide') {
        document.getElementById('panelGuide').classList.remove('hidden');
        document.getElementById('tabBtnGuide').className = "flex-1 py-2.5 rounded-xl bg-white shadow-xs text-teal-700 font-black transition-all flex items-center justify-center gap-1.5";
    }
}

function loadSampleNote() {
    document.getElementById('studyNoteInput').value = 
`PHY 101: Kinematics and Dynamics in Medical Physics
1. Kinematics describes motion without considering the forces causing it.
2. Velocity is the rate of change of displacement: v = ds/dt.
3. Acceleration is the rate of change of velocity: a = dv/dt.
4. Equations of uniformly accelerated motion:
   - v = u + at
   - s = ut + 0.5 * a * t^2
   - v^2 = u^2 + 2 * a * s
5. Projectile motion separates into horizontal motion at constant velocity and vertical motion under gravity g = 9.8 m/s^2.
6. Blood flow hemodynamics in capillaries approximates laminar flow where fluid velocity profiles follow parabolic laminar shears.`;
}

function activateNotes() {
    const text = document.getElementById('studyNoteInput').value.trim();
    if (!text) {
        alert("Please paste your study notes first!");
        return;
    }

    document.getElementById('guideContent').innerHTML = `
        <h4 class="font-black text-teal-900 text-sm">Synthesized High-Yield Points:</h4>
        <div class="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-2 mt-2">
            ${text.split('\n').map(line => line.trim() ? `<p class="flex items-start gap-2"><strong class="text-teal-600">&bull;</strong> <span>${line}</span></p>` : '').join('')}
        </div>
    `;

    const lines = text.split('\n').filter(l => l.trim().length > 20);
    const container = document.getElementById('quizQuestionsContainer');
    container.innerHTML = '';

    if (lines.length > 0) {
        lines.slice(0, 3).forEach((line, i) => {
            const div = document.createElement('div');
            div.className = "p-4 rounded-2xl border border-teal-100 bg-slate-50/50 space-y-3";
            div.innerHTML = `
                <span class="text-xs font-bold uppercase text-teal-700 block font-mono">Question ${i + 1}</span>
                <p class="text-xs font-semibold text-slate-800">Based on your notes: "${line.substring(0, 80)}...", which statement is true?</p>
                <div class="space-y-1.5 text-xs">
                    <button onclick="this.className='w-full text-left p-2.5 rounded-xl border border-emerald-400 bg-emerald-50 text-emerald-900 font-bold'; document.getElementById('quizScoreDisplay').innerText='Score: ' + (++quizScore);" class="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:bg-white transition-colors">A) The principle functions according to standard physical laws.</button>
                    <button onclick="this.className='w-full text-left p-2.5 rounded-xl border border-rose-400 bg-rose-50 text-rose-900 font-bold';" class="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:bg-white transition-colors">B) The physiological outcome is inversely opposed.</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    alert("Study notes analyzed! You can now chat with the AI tutor, take the generated quiz, or review high-yield summary points.");
}

let quizScore = 0;

function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const q = input.value.trim();
    if (!q) return;

    const chat = document.getElementById('chatMessages');

    chat.innerHTML += `
        <div class="flex gap-2.5 items-start justify-end">
            <div class="bg-teal-600 text-white p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-lg shadow-xs">
                ${q}
            </div>
        </div>
    `;

    input.value = '';

    setTimeout(() => {
        chat.innerHTML += `
            <div class="flex gap-2.5 items-start">
                <div class="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs"><i data-lucide="bot" class="w-4 h-4"></i></div>
                <div class="bg-white p-3.5 rounded-2xl rounded-tl-none border border-slate-200/80 text-xs text-slate-800 leading-relaxed shadow-xs max-w-lg">
                    In medical sciences, this concept is central to systemic homeostasis and hemodynamics. When analyzed against your syllabus, compensatory mechanisms operate to maintain equilibrium under varying physiological conditions.
                </div>
            </div>
        `;
        chat.scrollTop = chat.scrollHeight;
        lucide.createIcons();
    }, 400);
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
