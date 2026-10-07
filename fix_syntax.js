const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/lead-dashboard'),
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/dashboard/researcher'),
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/resource-dashboard'),
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/admin-dashboard')
];

function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
  let files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

let files = [];
targetDirs.forEach(d => {
  files = files.concat(getAllFiles(d));
});

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // The regex to fix: a trailing comma before the injected `, boxShadow`
  // Example: `cursor: "pointer",\n   , boxShadow:` -> `cursor: "pointer", boxShadow:`
  // Or: `,\s*, boxShadow:` -> `, boxShadow:`
  
  content = content.replace(/,\s*,\s*boxShadow:/g, ', boxShadow:');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed syntax in ${file}`);
  }
});
