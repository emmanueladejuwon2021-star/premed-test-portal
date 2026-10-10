const fs = require('fs');
let code = fs.readFileSync('src/views/AdminDashboard.tsx', 'utf8');
code = code.replace(/setShowCourseModal/g, 'setShowAddCourse');
fs.writeFileSync('src/views/AdminDashboard.tsx', code);
console.log('Fixed variable names');
