const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/resource-dashboard/layout.tsx'),
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/admin-dashboard/layout.tsx')
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Make sidebar floating white
    content = content.replace(
      /sidebar:\s*\{[\s\S]*?z-index:\s*20,\s*userSelect:\s*"none",\s*\},/g,
      `sidebar: {
    width: 220,
    minWidth: 220,
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    padding: "20px 0",
    position: "fixed",
    top: 16,
    left: 16,
    bottom: 16,
    height: "calc(100vh - 32px)",
    zIndex: 20,
    userSelect: "none",
    borderRadius: 12,
    border: "1px solid #f3f4f6",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)"
  },`
    );

    // Some simple fallback regex replacements if the exact one doesn't hit
    content = content.replace(/background:\s*["']#161616["']/g, 'background: "#ffffff"');
    content = content.replace(/borderBottom:\s*["']1px solid #2a2a2a["']/g, 'borderBottom: "1px solid #f3f4f6"');
    content = content.replace(/borderTop:\s*["']1px solid #2a2a2a["']/g, 'borderTop: "1px solid #f3f4f6"');
    
    // Brand Name color
    content = content.replace(/brandName:\s*\{[^}]*color:\s*["']#ffffff["'][^}]*\}/, (match) => {
      return match.replace(/color:\s*["']#ffffff["']/, 'color: "#111827"');
    });

    // Nav Item
    content = content.replace(/navItem:\s*\{([^}]+)\}/, (match, body) => {
      let newBody = body.replace(/color:\s*["']#888888["']/, 'color: "#4b5563"');
      return `navItem: {${newBody}}`;
    });

    // Nav Item Active
    content = content.replace(/navItemActive:\s*\{([^}]+)\}/, (match, body) => {
      let newBody = body.replace(/color:\s*["']#ffffff["']/, 'color: "#4f46e5"');
      newBody = newBody.replace(/background:\s*["']#2d2d2d["']/, 'background: "#eef2ff"');
      return `navItemActive: {${newBody}}`;
    });

    // Nav Icons
    content = content.replace(/navIcon:\s*\{([^}]+)\}/, (match, body) => {
      let newBody = body.replace(/color:\s*["']#888888["']/, 'color: "#6b7280"');
      return `navIcon: {${newBody}}`;
    });
    content = content.replace(/navIconActive:\s*\{([^}]+)\}/, (match, body) => {
      let newBody = body.replace(/color:\s*["']#ffffff["']/, 'color: "#4f46e5"');
      return `navIconActive: {${newBody}}`;
    });

    // Main Wrapper Margin adjustment
    content = content.replace(/marginLeft:\s*210/g, 'marginLeft: 252');

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed sidebar in ${file}`);
  }
});
