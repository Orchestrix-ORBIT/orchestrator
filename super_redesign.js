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

  // 1. Upgrade Shadows to Deep 3D Shadows
  content = content.replace(/boxShadow:\s*["']0 4px 6px -1px rgba\(0, 0, 0, 0\.05\), 0 2px 4px -1px rgba\(0,0,0,0\.03\)["']/g, 'boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)"');
  
  // 2. Soften Borders
  content = content.replace(/border:\s*["']1px solid #e5e7eb["']/g, 'border: "1px solid #f3f4f6"');
  
  // 3. Fix Link / Primary Text colors from bright blue to Indigo
  content = content.replace(/color:\s*["']#2563eb["']/g, 'color: "#4f46e5"');
  content = content.replace(/background:\s*["']#eff6ff["']/g, 'background: "#e0e7ff"');
  content = content.replace(/border:\s*["']1px solid #bfdbfe["']/g, 'border: "1px solid #c7d2fe"');

  // 4. Refine ACTIVE Badge
  content = content.replace(/activeStyle:\s*\{\s*background:\s*["']#dcfce7["'],\s*color:\s*["']#166534["']/g, 'activeStyle: { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0"');
  
  // 5. Refine ARCHIVED Badge
  content = content.replace(/archivedStyle:\s*\{\s*background:\s*["']#f3f4f6["'],\s*color:\s*["']#374151["']/g, 'archivedStyle: { background: "#f9fafb", color: "#4b5563", border: "1px solid #e5e7eb"');

  // 6. Refine filterRow (tabs)
  content = content.replace(/filterRow:\s*\{\s*display:\s*["']flex["'],\s*gap:\s*8/g, 'filterRow: { display: "inline-flex", gap: 4, background: "#f3f4f6", padding: 4, borderRadius: 12');
  
  // 7. Refine filterTabActive (make it floating white pill instead of black)
  content = content.replace(/filterTabActive:\s*\{\s*background:\s*["']#111827["'],\s*color:\s*["']#ffffff["']/g, 'filterTabActive: { background: "#ffffff", color: "#111827", boxShadow: "0 2px 4px rgba(0,0,0,0.05)"');

  // 8. Add shadow to primary buttons
  content = content.replace(/btnPrimary:\s*\{([^}]+)\}/g, (match, p1) => {
    let newStyles = p1;
    if (!newStyles.includes('boxShadow')) {
      newStyles = newStyles + ', boxShadow: "0 4px 6px -1px rgba(17, 24, 39, 0.15)"';
    }
    return `btnPrimary: {${newStyles}}`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
