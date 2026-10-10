import { exec } from 'child_process';

console.log("[INFO] Finding running tsx / node seeding scripts...");
exec('ps aux | grep tsx', (err, stdout, stderr) => {
  if (err) {
    console.error("Failed to run ps:", err);
    return;
  }

  const lines = stdout.split('\n');
  const myPid = process.pid;

  for (const line of lines) {
    if ((line.includes('seed-') || line.includes('seed-sequential') || line.includes('clean-source-references') || line.includes('refine-all-questions')) && !line.includes('kill-all')) {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[1], 10);
      if (pid && pid !== myPid) {
        console.log(`[KILL] Terminating process with PID: ${pid} (${line.slice(0, 100)})`);
        try {
          process.kill(pid, 'SIGKILL');
        } catch (e: any) {
          console.error(`Failed to kill PID ${pid}:`, e.message);
        }
      }
    }
  }
  console.log("[INFO] Process cleaning completed.");
});
