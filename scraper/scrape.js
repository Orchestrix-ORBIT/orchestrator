const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Navigate to the target site
  const url = 'https://adeptindustries.dev/dashboard';
  console.log(`Navigating to ${url}...`);
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log(`Network idle timeout, but continuing...`);
  }

  console.log('Extracting design tokens...');
  // Evaluate page to extract computed styles (colors, fonts, etc.)
  const designData = await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    const colors = new Set();
    const bgColors = new Set();
    const fonts = new Set();
    const fontSizes = new Set();
    const borderRadii = new Set();
    const boxShadows = new Set();
    
    // Track recurring class names related to layout/styling
    const classFrequencies = {};

    function rgbToHex(rgbStr) {
      if (!rgbStr || rgbStr === 'rgba(0, 0, 0, 0)' || rgbStr === 'transparent') return null;
      const rgb = rgbStr.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
      return (rgb && rgb.length === 4) ? "#" +
        ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : rgbStr;
    }

    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      
      const c = rgbToHex(style.color);
      if (c && c !== '#000000') colors.add(c);
      
      const bg = rgbToHex(style.backgroundColor);
      if (bg && bg !== '#000000' && bg !== 'rgba(0, 0, 0, 0)') bgColors.add(bg);
      
      if (style.fontFamily) fonts.add(style.fontFamily);
      if (style.fontSize) fontSizes.add(style.fontSize);
      if (style.borderRadius && style.borderRadius !== '0px') borderRadii.add(style.borderRadius);
      if (style.boxShadow && style.boxShadow !== 'none') boxShadows.add(style.boxShadow);
      
      if (el.className && typeof el.className === 'string') {
        el.className.split(' ').forEach(cls => {
          if (cls) {
            classFrequencies[cls] = (classFrequencies[cls] || 0) + 1;
          }
        });
      }
    });
    
    return {
      colors: Array.from(colors),
      bgColors: Array.from(bgColors),
      fonts: Array.from(fonts),
      fontSizes: Array.from(fontSizes).sort((a,b) => parseFloat(a) - parseFloat(b)),
      borderRadii: Array.from(borderRadii),
      boxShadows: Array.from(boxShadows),
      classes: Object.entries(classFrequencies).sort((a,b) => b[1] - a[1]).slice(0, 50).map(e => e[0])
    };
  });

  const outputPath = path.join(__dirname, 'design_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(designData, null, 2));
  console.log(`Design data extracted to ${outputPath}`);
  
  await browser.close();
})();
