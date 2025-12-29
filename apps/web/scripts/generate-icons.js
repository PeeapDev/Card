const fs = require('fs');
const path = require('path');

// Simple PNG generator for PWA icons
// Creates solid color icons with "POS" text

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Create a simple PNG using raw bytes (minimal implementation)
function createPNG(size) {
  // We'll use a data URL approach - create a canvas-like PNG
  // For simplicity, generate a basic colored square
  
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Green gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#10B981');
  gradient.addColorStop(1, '#059669');
  ctx.fillStyle = gradient;
  
  // Rounded rectangle
  const radius = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  
  // White shopping cart icon simplified
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.35}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POS', size / 2, size / 2);
  
  return canvas.toBuffer('image/png');
}

// Check if canvas is available
try {
  require.resolve('canvas');
  
  sizes.forEach(size => {
    const buffer = createPNG(size);
    const filename = path.join(iconsDir, `icon-${size}x${size}.png`);
    fs.writeFileSync(filename, buffer);
    console.log(`Created ${filename}`);
  });
  
  console.log('All icons generated!');
} catch (e) {
  console.log('Canvas not available, using fallback...');
  // Fallback: copy a simple base64 PNG
  process.exit(1);
}
