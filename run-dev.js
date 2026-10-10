const { exec } = require('child_process');

const child = exec('npm run dev');
child.stdout.on('data', data => console.log('OUT:', data.toString()));
child.stderr.on('data', data => console.error('ERR:', data.toString()));
child.on('close', code => console.log('EXIT:', code));

// Exit script after 7 seconds so it doesn't block forever
setTimeout(() => {
  child.kill();
  process.exit();
}, 7000);
