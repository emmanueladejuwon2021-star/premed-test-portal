<?php
/**
 * AI Active Study Lab
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Study Room';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="studyApp">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 text-xs font-bold border border-cyan-200 mb-2">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-cyan-600"></i>
                <span>AI Study Buddy</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Study Room</h1>
            <p class="text-xs text-slate-500 mt-1">Paste your lecture notes to chat with AI, test yourself, and generate quick summaries.</p>
        </div>
    </div>

    <!-- Step 1: Note Ingestion Box -->
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div class="flex justify-between items-center">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Paste Your Study Notes</label>
            <button type="button" onclick="loadSampleNote()" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold">Load Medical Sample</button>
        </div>
        <textarea id="studyNoteInput" rows="5" placeholder="Paste your study notes or lecture slides here..." class="w-full p-4 rounded-2xl border border-slate-200 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"></textarea>
        <div class="flex justify-end">
            <button type="button" onclick="activateNotes()" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
                <span>Start Studying</span>
            </button>
        </div>
    </div>

    <!-- Step 2: Interactive Tabs (Chat, Quiz, Study Guide) -->
    <div id="studyTabsContainer" class="space-y-6">
        <div class="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600 max-w-md">
            <button type="button" onclick="switchStudyTab('chat')" id="tabBtnChat" class="flex-1 py-2.5 rounded-xl bg-white shadow-sm text-indigo-700 transition-all flex items-center justify-center gap-1.5">
                <i data-lucide="message-square" class="w-4 h-4"></i>
                <span>Chat & Ask</span>
            </button>
            <button type="button" onclick="switchStudyTab('quiz')" id="tabBtnQuiz" class="flex-1 py-2.5 rounded-xl hover:text-slate-900 transition-all flex items-center justify-center gap-1.5">
                <i data-lucide="help-circle" class="w-4 h-4"></i>
                <span>Practice Quiz</span>
            </button>
            <button type="button" onclick="switchStudyTab('guide')" id="tabBtnGuide" class="flex-1 py-2.5 rounded-xl hover:text-slate-900 transition-all flex items-center justify-center gap-1.5">
                <i data-lucide="book-open" class="w-4 h-4"></i>
                <span>Summary Notes</span>
            </button>
        </div>

        <!-- Tab Panel: Chat -->
        <div id="panelChat" class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div id="chatMessages" class="h-80 overflow-y-auto space-y-3 p-2 border border-slate-100 rounded-2xl bg-slate-50/50">
                <div class="flex gap-2.5 items-start">
                    <div class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0"><i data-lucide="bot" class="w-4 h-4"></i></div>
                    <div class="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200/80 text-xs text-slate-800 leading-relaxed shadow-sm max-w-lg">
                        Hello! Paste your lecture material above, and I will dissect key mechanisms, clarify difficult concepts, and answer your inquiries.
                    </div>
                </div>
            </div>

            <form onsubmit="handleChatSubmit(event)" class="flex gap-2">
                <input type="text" id="chatInput" placeholder="Ask a question about your notes..." class="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <button type="submit" class="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-1.5">
                    <span>Send</span>
                    <i data-lucide="send" class="w-3.5 h-3.5"></i>
                </button>
            </form>
        </div>

        <!-- Tab Panel: Quiz -->
        <div id="panelQuiz" class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hidden space-y-6">
            <div class="flex justify-between items-center">
                <h3 class="text-sm font-bold text-slate-900">Extracted Practice Drill</h3>
                <span class="text-xs font-bold text-indigo-600" id="quizScoreDisplay">Score: 0</span>
            </div>
            <div id="quizQuestionsContainer" class="space-y-4">
                <p class="text-xs text-slate-500">Paste your lecture notes above and click 'Process & Activate Study Lab' to generate practice questions.</p>
            </div>
        </div>

        <!-- Tab Panel: Guide -->
        <div id="panelGuide" class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hidden space-y-4">
            <h3 class="text-sm font-bold text-slate-900">High-Yield Textbook Summary Guide</h3>
            <div id="guideContent" class="text-xs text-slate-700 leading-relaxed space-y-3 p-4 border border-slate-100 rounded-2xl bg-slate-50">
                <p class="text-slate-400 italic">No notes loaded yet. Paste your lecture notes to compile an organized high-yield study sheet.</p>
            </div>
        </div>
    </div>
</div>

<script>
let currentTab = 'chat';

function switchStudyTab(tab) {
    currentTab = tab;
    ['chat', 'quiz', 'guide'].forEach(t => {
        document.getElementById(`panel${t.charAt(0).toUpperCase() + t.slice(1)}`).classList.toggle('hidden', t !== tab);
        const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (t === tab) {
            btn.className = "flex-1 py-2.5 rounded-xl bg-white shadow-sm text-indigo-700 font-bold transition-all flex items-center justify-center gap-1.5";
        } else {
            btn.className = "flex-1 py-2.5 rounded-xl hover:text-slate-900 transition-all flex items-center justify-center gap-1.5";
        }
    });
    lucide.createIcons();
}

function loadSampleNote() {
    document.getElementById('studyNoteInput').value = `Cardiovascular Physiology & Hemodynamics:
1. Cardiac Cycle: Divided into systole (ventricular contraction and blood ejection) and diastole (ventricular relaxation and chamber filling). Normal resting heart rate is 60-100 bpm.
2. Blood Pressure Regulation: Regulated acutely by the baroreceptor reflex located in the carotid sinus and aortic arch. Long-term regulation is mediated by the Renin-Angiotensin-Aldosterone System (RAAS) in the kidneys.
3. Frank-Starling Mechanism: Stroke volume increases in response to an increase in end-diastolic volume (preload) when all other factors remain constant.`;
}

function activateNotes() {
    const text = document.getElementById('studyNoteInput').value.trim();
    if (!text) {
        alert("Please paste your study notes first!");
        return;
    }

    // Compile Guide
    document.getElementById('guideContent').innerHTML = `
        <h4 class="font-extrabold text-indigo-900 text-sm">Synthesized High-Yield Points:</h4>
        <div class="p-3 bg-white rounded-xl border border-slate-200 space-y-2 mt-2">
            ${text.split('\n').map(line => line.trim() ? `<p><strong>&bull;</strong> ${line}</p>` : '').join('')}
        </div>
    `;

    // Extract Demo Questions
    const lines = text.split('\n').filter(l => l.trim().length > 20);
    const container = document.getElementById('quizQuestionsContainer');
    container.innerHTML = '';

    if (lines.length > 0) {
        lines.slice(0, 3).forEach((line, i) => {
            const div = document.createElement('div');
            div.className = "p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3";
            div.innerHTML = `
                <span class="text-xs font-bold uppercase text-indigo-600 block">Question ${i + 1}</span>
                <p class="text-xs font-semibold text-slate-800">Based on your notes: "${line.substring(0, 80)}...", which statement is true?</p>
                <div class="space-y-1.5 text-xs">
                    <button onclick="this.className='w-full text-left p-2 rounded-xl border border-emerald-400 bg-emerald-50 text-emerald-900 font-bold'; document.getElementById('quizScoreDisplay').innerText='Score: ' + (++quizScore);" class="w-full text-left p-2 rounded-xl border border-slate-200 hover:bg-white transition-colors">A) The mechanism functions as stated in the textbook.</button>
                    <button onclick="this.className='w-full text-left p-2 rounded-xl border border-rose-400 bg-rose-50 text-rose-900 font-bold';" class="w-full text-left p-2 rounded-xl border border-slate-200 hover:bg-white transition-colors">B) The physiological effect is completely inverted.</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    alert("Study notes digitized successfully! You can now chat with the AI tutor, take the generated quiz, or review your study guide.");
}

let quizScore = 0;

function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const q = input.value.trim();
    if (!q) return;

    const chat = document.getElementById('chatMessages');

    // Add user bubble
    chat.innerHTML += `
        <div class="flex gap-2.5 items-start justify-end">
            <div class="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-lg">
                ${q}
            </div>
        </div>
    `;

    input.value = '';

    // Simulate AI response
    setTimeout(() => {
        chat.innerHTML += `
            <div class="flex gap-2.5 items-start">
                <div class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0"><i data-lucide="bot" class="w-4 h-4"></i></div>
                <div class="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200/80 text-xs text-slate-800 leading-relaxed shadow-sm max-w-lg">
                    In medical science, this concept relates directly to homeostatic equilibrium. When applying your uploaded notes, physiological compensatory mechanisms act to maintain optimal organ perfusion and metabolic demands.
                </div>
            </div>
        `;
        chat.scrollTop = chat.scrollHeight;
        lucide.createIcons();
    }, 400);
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
