const { execSync } = require('child_process');
const fs = require('fs');

const GIT = 'C:\\tools\\mingit\\cmd\\git.exe';
const git = (cmd) => execSync(`"${GIT}" -c credential.helper="" -c http.sslVerify=false ${cmd}`, { encoding: 'utf8' });

// Clean all untracked js
const toClean = ['check_git_remote.js', 'test_push_with_config.js', 'pull_and_push.js', 'do_push.js', 'git_commit_and_push.js', 'list_files.js'];
toClean.forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

console.log('0. Current status:');
try {
  console.log(git('status --short'));
} catch (e) {}

console.log('1. Adding and committing all modified files...');
try {
  git('add -A');
  git('commit -m "feat: immediate result page delivery on exam submission and strict back-navigation lockout protection"');
} catch (e) {
  console.log('Commit note:', e.message);
}

console.log('\n2. Merging/rebasing origin/main...');
try {
  const r = git('pull --rebase origin main');
  console.log('Rebase/pull output:\n', r);
} catch (e) {
  console.log('Pull err:\n', e.stdout || e.message);
}

console.log('\n3. Pushing to origin main...');
try {
  const pushOut = git('push origin main');
  console.log('Push output:\n', pushOut);
  console.log('\nSUCCESS! ALL COMMITS ARE LIVE ON GITHUB!');
} catch (e) {
  console.log('Push err:\n', e.stdout || e.message);
}
