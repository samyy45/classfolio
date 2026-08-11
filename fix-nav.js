const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
};

const files = walk('./app/hod');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  if (content.includes('lucide-react') && !content.includes('UserCheck')) {
    content = content.replace(/Users([,}])/, 'Users, UserCheck$1');
  }

  if (!content.includes('/class-attendance')) {
    content = content.replace(/{\s*Icon:\s*User\s*,\s*label:\s*'Profile'/g, "{ Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },\n          $&");
    content = content.replace(/{\s*label:\s*'Profile'\s*,\s*path:\s*'\/profile'/g, "{ label: 'Attendance', path: '/class-attendance', Icon: UserCheck },\n            $&");
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed nav in', file);
  }
}
