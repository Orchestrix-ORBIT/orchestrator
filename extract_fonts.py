import urllib.request
import re

url = 'https://adeptindustries.dev/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

# Look for font links, font-family declarations in inline styles or anything font related
font_links = set(re.findall(r'fonts\.googleapis\.com[^\s\'"]+', html))
font_families = set(re.findall(r'font-family[^;>\}]*', html))
font_names = set(re.findall(r'font[_\-]family[\s]*[:=][\s]*[\'"]?([A-Za-z0-9\s,\-]+)[\'"]?', html))

print("Google Font Links:", font_links)
print("Font Families:", font_families)
print("Font Names:", font_names)

# also search for next/font classes if they use next.js
next_fonts = set(re.findall(r'__className_[a-zA-Z0-9]+', html))
print("Next.js font classes:", next_fonts)
