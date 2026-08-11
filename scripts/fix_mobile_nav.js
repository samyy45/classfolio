const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(__dirname, '..', 'app'), (filePath) => {
  if (filePath.endsWith('page.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Mobile Nav Removals where there's no `active: ...`
    content = content.replace(/\s*\{\s*Icon:\s*Upload,\s*label:\s*'Upload',\s*path:\s*'\/upload'\s*\},/g, '');
    content = content.replace(/\s*\{\s*Icon:\s*GraduationCap,\s*label:\s*'Teachers',\s*path:\s*'\/hod\/teachers'\s*\},/g, '');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated mobile nav in ${filePath}`);
    }
  }
});
