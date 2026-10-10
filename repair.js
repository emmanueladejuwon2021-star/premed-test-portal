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

  // Fix ); =>
  content = content.replace(/\);\s*=>/g, ') =>');
  
  // Fix toString();,
  content = content.replace(/\.toString\(\);,/g, '.toString(),');
  
  // Fix toString();}
  content = content.replace(/\.toString\(\);\s*\}/g, '.toString() }');

  // Fix return reply.status(500).send({success: true}); -> reply.send({success: true});
  content = content.replace(/return reply\.status\(500\)\.send\(\{success:\s*true\}\);/g, 'return reply.send({success: true});');
  
  // Fix catch(e:any){ return reply.send({error:e.message}); } -> reply.status(500).send({error:e.message})
  content = content.replace(/catch\s*\(e:any\)\s*\{\s*return reply\.send\(\{error:e\.message\}\);\s*\}/g, 'catch(e:any){ return reply.status(500).send({error:e.message}); }');
  
  content = content.replace(/catch\s*\(e\)\s*\{\s*return reply\.send\(\{error:e\.message\}\);\s*\}/g, 'catch(e){ return reply.status(500).send({error:e.message}); }');

  fs.writeFileSync(file, content);
}
console.log('Fixed');
