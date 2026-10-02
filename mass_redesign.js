const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/lead-dashboard'),
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/admin-dashboard'),
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/dashboard/researcher')
];

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);
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
  if (fs.existsSync(d)) {
    files = files.concat(getAllFiles(d));
  }
});

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace text colors
  content = content.replace(/color:\s*["']#161616["']/g, 'color: "#111827"');
  content = content.replace(/color:\s*["']#424242["']/g, 'color: "#374151"');
  content = content.replace(/color:\s*["']#888888["']/g, 'color: "#6b7280"');
  content = content.replace(/color:\s*["']#888["']/g, 'color: "#6b7280"');

  // Replace card backgrounds and borders to modern ones
  content = content.replace(/border:\s*["']1px solid #e8e8e8["']/g, 'border: "1px solid #e5e7eb"');
  content = content.replace(/border:\s*["']1px solid #e0e0e0["']/g, 'border: "1px solid #e5e7eb"');
  content = content.replace(/borderBottom:\s*["']1px solid #e0e0e0["']/g, 'borderBottom: "1px solid #e5e7eb"');
  content = content.replace(/borderBottom:\s*["']1px solid #f0f0f0["']/g, 'borderBottom: "1px solid #f3f4f6"');
  content = content.replace(/borderBottom:\s*["']1px solid #f8f8f8["']/g, 'borderBottom: "1px solid #f9fafb"');

  // Find standard cards and inject 3D shadows + 12px radius
  content = content.replace(/borderRadius:\s*8/g, 'borderRadius: 12');
  
  // Replace old box-shadows with modern 3D shadows
  content = content.replace(/boxShadow:\s*["']0 1px 3px rgba\(0,0,0,0.03\)["']/g, 'boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0,0,0,0.03)"');
  
  // Also add shadow to objects that have background: '#fff' and borderRadius: 12 if they don't have boxShadow
  // We can do this with a simpler regex or manual edit.
  // The simplest is to replace `padding: 24,` or `padding: "24px",` inside card objects if we can match them.
  // Let's replace specifically inside `card: { ... }` or `statCard: { ... }`
  content = content.replace(/card:\s*\{([^}]+)\}/g, (match, p1) => {
    let newStyles = p1;
    if (!newStyles.includes('boxShadow')) {
      newStyles = newStyles + ', boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)"';
    } else {
      newStyles = newStyles.replace(/boxShadow:\s*["'][^"']+["']/, 'boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)"');
    }
    return `card: {${newStyles}}`;
  });

  // Check inline styles for cards (e.g., in projects/[id]/page.tsx)
  content = content.replace(/boxShadow:\s*["']0 20px 60px rgba\(0,0,0,0.18\)["']/g, 'boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"');

  // Replace background colors from old #fff to new #ffffff just to be consistent
  content = content.replace(/background:\s*["']#fff["']/g, 'background: "#ffffff"');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
