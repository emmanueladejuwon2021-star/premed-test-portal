const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

// PascalCase to kebab-case
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .toLowerCase();
}

const srcDir = path.resolve(__dirname, 'src');
const files = getFiles(srcDir);

const iconNames = new Set();

files.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match import { ... } from 'lucide-react'
  // Support multiline imports
  const matches = content.matchAll(/import\s*\{([^{}]*?)\}\s*from\s*['"]lucide-react['"]/g);
  for (const match of matches) {
    const imports = match[1]
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // remove comments
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    imports.forEach((imp) => {
      // Handle "Calculator as CalcIcon" or "Image as ImageIcon"
      const parts = imp.split(/\s+as\s+/i);
      const originalName = parts[0].trim();
      if (originalName) {
        iconNames.add(originalName);
      }
    });
  }
});

// Always include some common fallbacks if needed
const iconsList = Array.from(iconNames).sort();
console.log(`Found ${iconsList.length} unique icon imports in src/`);

let outputContent = `// Automatically generated file. Do not edit directly.
`;

const missingIcons = [];

iconsList.forEach((icon) => {
  let kebab = toKebabCase(icon);
  
  // Lucide has some special mapping cases, e.g. Image -> image.js
  // Let's resolve the actual file name
  let possiblePaths = [
    `${kebab}.js`,
  ];
  
  // Custom manual mappings or fallbacks if the standard mapping doesn't exist
  let resolvedFile = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(__dirname, 'node_modules/lucide-react/dist/esm/icons', p))) {
      resolvedFile = p;
      break;
    }
  }

  // Fallbacks for special naming variants in lucide
  if (!resolvedFile) {
    // E.g., is there a matching file without number or with minor difference?
    console.warn(`Warning: icon file for ${icon} (${kebab}.js) not found directly.`);
    missingIcons.push({ icon, kebab });
  } else {
    outputContent += `export { default as ${icon} } from 'lucide-react/dist/esm/icons/${resolvedFile}';\n`;
  }
});

// Write to src/lib/icons.ts
const distDir = path.join(srcDir, 'lib');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
fs.writeFileSync(path.join(distDir, 'icons.ts'), outputContent, 'utf8');
console.log(`Successfully generated src/lib/icons.ts with ${iconsList.length - missingIcons.length} icons!`);

if (missingIcons.length > 0) {
  console.log('Skipped or missing icons:', missingIcons);
}
