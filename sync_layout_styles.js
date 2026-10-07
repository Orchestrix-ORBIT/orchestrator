const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/resource-dashboard/layout.tsx'),
  path.join(__dirname, 'frontend/orchestrix_orbit_frontend/app/admin-dashboard/layout.tsx')
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Root & MainWrapper Background
    content = content.replace(/background:\s*["']#f5f5f5["']/g, 'background: "#f9fafb"');

    // 2. Sidebar proper floating match
    content = content.replace(/sidebar:\s*\{[^}]+\}/, `sidebar: {
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
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  }`);

    // 3. Topbar blend with background
    content = content.replace(/topbar:\s*\{[^}]+\}/, `topbar: {
    height: 48,
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    position: "sticky",
    top: 0,
    zIndex: 10,
  }`);

    // 4. Logout button fix in sidebar
    content = content.replace(/logoutBtn:\s*\{[^}]+\}/, `logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    color: "#4b5563",
    background: "transparent",
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
  }`);

    // 5. topbarAvatar background fix
    content = content.replace(/topbarAvatar:\s*\{([^}]+)\}/, (match, body) => {
      let newBody = body.replace(/background:\s*["']#ffffff["']/, 'background: "#1976d2"'); // match lead
      newBody = newBody.replace(/color:\s*["']#ffffff["']/, 'color: "#ffffff"');
      return `topbarAvatar: {${newBody}}`;
    });

    // 6. Brand styling tweaks
    content = content.replace(/brand:\s*\{([^}]+)\}/, (match, body) => {
       let newBody = body.replace(/borderBottom:\s*["']1px solid #f3f4f6["']/, 'borderBottom: "1px solid #f3f4f6"');
       return `brand: {${newBody}}`;
    });

    // 7. Footer border tweak
    content = content.replace(/footer:\s*\{([^}]+)\}/, (match, body) => {
       let newBody = body.replace(/borderTop:\s*["']1px solid #f3f4f6["']/, 'borderTop: "1px solid #f3f4f6"');
       return `footer: {${newBody}}`;
    });

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Synced styles in ${file}`);
  }
});
