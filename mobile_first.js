const fs = require('fs');

function mobileFirstPatch(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Convert standard desktop paddings to mobile-first responsive paddings where it makes a big difference
  code = code.replace(/p-8/g, 'p-5 md:p-8');
  code = code.replace(/rounded-\[3rem\]/g, 'rounded-[2rem] md:rounded-[3rem]');
  code = code.replace(/rounded-\[2.5rem\]/g, 'rounded-[1.5rem] md:rounded-[2.5rem]');
  code = code.replace(/py-20 md:py-32/g, 'py-12 md:py-32');
  code = code.replace(/text-4xl md:text-5xl/g, 'text-3xl md:text-5xl');
  code = code.replace(/px-8 py-6/g, 'px-4 md:px-8 py-4 md:py-6');
  
  fs.writeFileSync(file, code);
}

mobileFirstPatch('src/views/QuestionBankView.tsx');
mobileFirstPatch('src/views/AdminDashboard.tsx');
console.log('Mobile-first spacing applied');
