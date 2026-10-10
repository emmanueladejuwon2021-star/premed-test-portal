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

  // Replace Hono imports
  content = content.replace(/import \{ Hono \} from 'hono';\n?/g, '');
  content = content.replace(/import \{.*?Context.*?\} from 'hono';\n?/g, '');

  content = content.replace(/const app = new Hono\(\);\n?/g, 'import { FastifyInstance } from "fastify";\n\nexport default async function routes(app: FastifyInstance) {\n');

  content = content.replace(/async\s*\(c\)\s*=>/g, 'async (request, reply) =>');
  content = content.replace(/async\s*\(c:\s*any\)\s*=>/g, 'async (request, reply) =>');
  content = content.replace(/\(c\)\s*=>/g, 'async (request, reply) =>');
  
  content = content.replace(/,\s*verifyToken\s*,\s*async\s*\(request, reply\)\s*=>/g, ', { preHandler: [verifyToken] }, async (request, reply) =>');
  content = content.replace(/,\s*verifyToken\s*,\s*requireAdmin\s*,\s*async\s*\(request, reply\)\s*=>/g, ', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) =>');

  content = content.replace(/await c\.req\.json\(\)(?:\.catch\(\(\) => \(\{\}\)\))?/g, '(request.body || {})');
  content = content.replace(/await c\.req\.parseBody\(\)/g, '(request.body || {})');

  content = content.replace(/c\.req\.param\(([^)]+)\)/g, '(request.params as any)[$1]');

  content = content.replace(/return c\.json\(([^,]+),\s*(\d+)\);?/g, 'return reply.status($2).send($1);');
  content = content.replace(/c\.json\(([^,]+),\s*(\d+)\);?/g, 'reply.status($2).send($1);');

  content = content.replace(/return c\.json\(([^)]+)\);?/g, 'return reply.send($1);');
  content = content.replace(/c\.json\(([^)]+)\)/g, 'reply.send($1)');

  // any remaining c context get usage
  content = content.replace(/c\.get\("user" as any\)/g, '(request as any).user');

  content = content.replace(/export default app;/g, '}\n');

  fs.writeFileSync(file, content);
}
console.log('Done');
