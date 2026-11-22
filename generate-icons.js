const fs = require('fs');
const path = require('path');

// Create simple SVG icons as placeholders
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgTemplate = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#E85D75" rx="${size * 0.2}"/>
  <text x="${size/2}" y="${size/2 + size*0.1}" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle">🍰</text>
</svg>`;

const publicDir = path.join(__dirname, 'public');

sizes.forEach(size => {
  const svgContent = svgTemplate(size);
  fs.writeFileSync(path.join(publicDir, `icon-${size}x${size}.svg`), svgContent);
});

console.log('SVG icons created. Convert to PNG for production use.');
