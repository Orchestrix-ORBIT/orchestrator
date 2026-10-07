const fs = require('fs');
const path = require('path');

const variants = {
  'app/lead-dashboard/documents/page.tsx': 'grid',
  'app/lead-dashboard/team/page.tsx': 'table',
  'app/lead-dashboard/projects/page.tsx': 'table',
  'app/lead-dashboard/resources/page.tsx': 'grid',
  'app/lead-dashboard/notifications/page.tsx': 'table',
  'app/lead-dashboard/ai-insights/page.tsx': 'chat',
  'app/dashboard/researcher/tasks/page.tsx': 'table',
  'app/dashboard/researcher/resources/page.tsx': 'grid',
  'app/dashboard/researcher/projects/page.tsx': 'table',
  'app/dashboard/researcher/notifications/page.tsx': 'table',
  'app/dashboard/researcher/documents/page.tsx': 'grid',
  'app/dashboard/researcher/chat/page.tsx': 'chat',
  'app/resource-dashboard/assets/page.tsx': 'table',
  'app/resource-dashboard/maintenance/page.tsx': 'table',
  'app/resource-dashboard/notifications/page.tsx': 'table',
  'app/resource-dashboard/policies/page.tsx': 'table'
};

const frontendDir = path.join(__dirname, 'frontend/orchestrix_orbit_frontend');

for (const [file, variant] of Object.entries(variants)) {
  const fullPath = path.join(frontendDir, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes(`variant="`)) {
       content = content.replace(/<LoadingState\s+/g, `<LoadingState variant="${variant}" `);
       fs.writeFileSync(fullPath, content);
       console.log(`Updated ${file} with variant=${variant}`);
    } else {
       console.log(`Skipped ${file} (variant already exists)`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
}
