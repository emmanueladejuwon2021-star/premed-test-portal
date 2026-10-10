const fs = require('fs');

const files = [
  'src/routes/auth.ts',
  'src/routes/courses.ts',
  'src/routes/simulation.ts',
  'src/routes/admin.ts',
  'src/routes/developer.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const body = \(request\.body \|\| \{\}\);/g, 'const body: any = (request.body || {});');
  content = content.replace(/const body = await request\.body;/g, 'const body: any = request.body;');
  content = content.replace(/return reply\.status\(200\)\.send/g, 'return reply.status(200).send');
  content = content.replace(/return reply\.send\(\{success: true\}, 200\)/g, 'return reply.status(200).send({success:true})');

  fs.writeFileSync(file, content);
}
console.log('Fixed bodies');
