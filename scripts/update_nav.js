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
    
    // Desktop Nav Removals
    content = content.replace(/\s*\.\.\.\(isHod \? \[\{ label: 'Teachers', path: '\/hod\/teachers', Icon: GraduationCap \}\] : \[\]\),/g, '');
    content = content.replace(/\s*\{ label: 'Upload Excel', path: '\/upload', Icon: Upload \},/g, '');
    // In hod/teachers and hod/dashboard it might not have the isHod check
    content = content.replace(/\s*\{ label: 'Teachers', path: '\/hod\/teachers', Icon: GraduationCap \},/g, '');
    
    // Mobile Nav Removals
    content = content.replace(/\s*\{\s*Icon: Upload,\s*label: 'Upload',\s*path: '\/upload',\s*active: (false|true)\s*\},/g, '');
    content = content.replace(/\s*\{\s*Icon: GraduationCap,\s*label: 'Teachers',\s*path: '\/hod\/teachers',\s*active: (false|true)\s*\},/g, '');
    
    // Center Mobile Nav
    content = content.replace(/justifyContent:\s*'space-around'/g, "justifyContent: 'center', gap: 32");

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${filePath}`);
    }
  }
});
