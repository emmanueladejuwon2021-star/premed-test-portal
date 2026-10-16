<?php
/**
 * Student Home Dashboard - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
 */

require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$pageTitle = 'Home';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();
$studentId = $student['id'] ?? '';

// ... (stats, live test, recent tests queries remain exactly as before)

$firstName = htmlspecialchars(explode(' ', $student['name'] ?? 'Student')[0]);
?>

<!-- Banking Details Modal (shown if missing) -->
<div id="bankModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
    <div class="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 class="text-lg font-bold mb-4">Complete Banking Details</h2>
        <p class="text-sm text-gray-600 mb-4">Please provide your account information to be eligible for cash prizes.</p>
        <form id="bankForm" method="POST" action="login.php" class="space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="update_bank">
            <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Account Number</label>
                <input type="text" name="account_number" required minlength="10" maxlength="12" class="w-full border rounded px-3 py-2" />
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Bank</label>
                <select name="bank" required class="w-full border rounded px-3 py-2">
                    <option value="" disabled selected>-- Select your Bank --</option>
                    <option>Opay</option>
                    <option>PalmPay</option>
                    <option>Kuda</option>
                    <option>Moniepoint</option>
                    <option>SmartCash</option>
                    <option>Access Bank</option>
                    <option>GTBank</option>
                    <option>FirstBank</option>
                    <option>Zenith Bank</option>
                    <option>UBA</option>
                    <option>Stanbic IBTC</option>
                    <option>Wema Bank</option>
                    <option>FCMB</option>
                    <option>Union Bank</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Full Account Name</label>
                <input type="text" name="account_name" required minlength="4" class="w-full border rounded px-3 py-2" />
            </div>
            <div class="flex justify-end space-x-2">
                <button type="button" id="bankCancel" class="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-teal-600 text-white rounded">Save</button>
            </div>
            <div id="bankError" class="hidden text-sm text-red-600 mt-2"></div>
        </form>
    </div>
</div>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const student = <?php echo json_encode($student ?? []); ?>;
        const missing = !student.account_number || !student.bank || !student.account_name;
        if (missing) {
            document.getElementById('bankModal').classList.remove('hidden');
        }
        document.getElementById('bankCancel').addEventListener('click', function(){
            document.getElementById('bankModal').classList.add('hidden');
        });
        const form = document.getElementById('bankForm');
        form.addEventListener('submit', function(e){
            e.preventDefault();
            const formData = new FormData(form);
            fetch('login.php', {
                method: 'POST',
                body: formData,
            }).then(()=>{ location.reload(); })
            .catch(()=>{ document.getElementById('bankError').innerText = 'Failed to save details.'; document.getElementById('bankError').classList.remove('hidden'); });
        });
    });
</script>

<!-- Rest of the original index.php HTML (hero, cards, recent tests) remains unchanged -->
