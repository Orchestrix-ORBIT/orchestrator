const fs = require('fs');
const path = require('path');

async function extractStyles() {
  console.log('Fetching HTML...');
  const res = await fetch('https://adeptindustries.dev/');
  const html = await res.text();
  
  // Find stylesheet link
  const cssMatch = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"/);
  if (!cssMatch) {
    console.log('No stylesheet found in HTML. Using regex on entire HTML to find CSS links...');
    const allLinks = html.match(/href="([^"]+\.css)"/g);
    if (!allLinks) {
      console.log('Could not find CSS files.');
      return;
    }
  }

  let cssUrls = [];
  const linkRegex = /href="([^"]+\.css)"/g;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    cssUrls.push(match[1]);
  }

  console.log(`Found ${cssUrls.length} CSS files:`, cssUrls);

  const allStyles = [];
  
  for (const url of cssUrls) {
    let fullUrl = url;
    if (!url.startsWith('http')) {
      fullUrl = 'https://adeptindustries.dev' + (url.startsWith('/') ? '' : '/') + url;
    }
    
    console.log(`Fetching CSS: ${fullUrl}`);
    const cssRes = await fetch(fullUrl);
    const css = await cssRes.text();
    allStyles.push(css);
  }
  
  const combinedCss = allStyles.join('\n');
  
  // Extract all hex colors
  const hexColors = new Set(combinedCss.match(/#[0-9a-fA-F]{3,6}\b/g) || []);
  
  // Extract rgba colors
  const rgbaColors = new Set(combinedCss.match(/rgba?\([^)]+\)/g) || []);
  
  // Extract fonts
  const fonts = new Set(combinedCss.match(/font-family:[^;]+;/g) || []);

  const result = {
    hexColors: Array.from(hexColors),
    rgbaColors: Array.from(rgbaColors),
    fonts: Array.from(fonts)
  };
  
  const outputPath = path.join(__dirname, 'design_extracted.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  // Save full CSS for analysis
  fs.writeFileSync(path.join(__dirname, 'full_styles.css'), combinedCss);
  
  console.log('Extraction complete. Saved to design_extracted.json and full_styles.css');
}

extractStyles().catch(console.error);
