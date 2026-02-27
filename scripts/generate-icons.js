#!/usr/bin/env node
/**
 * SAQ Futé - Icon Generator
 * Generates all required app icons from SVG templates using sharp.
 *
 * Usage: node scripts/generate-icons.js
 * Requires: npm install --save-dev sharp
 */

const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('sharp not found, installing...');
    require('child_process').execSync('npm install --save-dev sharp', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  const outDir = path.resolve(__dirname, '..', 'assets', 'images');

  // === SVG Templates ===

  // App Icon (1024x1024) - Wine glass on burgundy background
  const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8B3A42"/>
      <stop offset="100%" stop-color="#5A252C"/>
    </linearGradient>
    <linearGradient id="wineFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C5A572" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#C5A572" stop-opacity="0.4"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>
  <!-- Wine glass bowl -->
  <path d="M350,200 C350,200 320,540 470,600 L554,600 C704,540 674,200 674,200"
        fill="none" stroke="#FFF8F0" stroke-width="32" stroke-linecap="round"/>
  <!-- Glass rim -->
  <ellipse cx="512" cy="200" rx="162" ry="28" fill="none" stroke="#FFF8F0" stroke-width="28"/>
  <!-- Wine fill -->
  <path d="M380,380 C380,380 360,540 470,600 L554,600 C664,540 644,380 644,380 Z"
        fill="url(#wineFill)"/>
  <!-- Stem -->
  <rect x="494" y="600" width="36" height="150" rx="18" fill="#FFF8F0"/>
  <!-- Base -->
  <ellipse cx="512" cy="760" rx="130" ry="28" fill="none" stroke="#FFF8F0" stroke-width="28"/>
  <!-- Sparkle star 1 -->
  <path d="M720,170 L732,130 L744,170 L784,182 L744,194 L732,234 L720,194 L680,182 Z"
        fill="#C5A572"/>
  <!-- Sparkle star 2 -->
  <path d="M780,100 L786,80 L792,100 L812,106 L792,112 L786,132 L780,112 L760,106 Z"
        fill="#C5A572" opacity="0.6"/>
</svg>`;

  // Adaptive Icon Foreground (1024x1024, no background, centered with safe zone padding)
  const adaptiveFgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="wineFillA" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C5A572" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#C5A572" stop-opacity="0.4"/>
    </linearGradient>
  </defs>
  <!-- Wine glass bowl (centered, with safe-zone padding ~30%) -->
  <path d="M380,260 C380,260 355,530 480,580 L544,580 C669,530 644,260 644,260"
        fill="none" stroke="#FFF8F0" stroke-width="28" stroke-linecap="round"/>
  <!-- Glass rim -->
  <ellipse cx="512" cy="260" rx="132" ry="22" fill="none" stroke="#FFF8F0" stroke-width="24"/>
  <!-- Wine fill -->
  <path d="M400,400 C400,400 385,530 480,580 L544,580 C639,530 624,400 624,400 Z"
        fill="url(#wineFillA)"/>
  <!-- Stem -->
  <rect x="498" y="580" width="28" height="120" rx="14" fill="#FFF8F0"/>
  <!-- Base -->
  <ellipse cx="512" cy="710" rx="100" ry="22" fill="none" stroke="#FFF8F0" stroke-width="24"/>
  <!-- Sparkle -->
  <path d="M680,230 L690,200 L700,230 L730,240 L700,250 L690,280 L680,250 L650,240 Z"
        fill="#C5A572"/>
  <path d="M720,180 L725,165 L730,180 L745,185 L730,190 L725,205 L720,190 L705,185 Z"
        fill="#C5A572" opacity="0.6"/>
</svg>`;

  // Splash Icon (transparent bg, wine glass + text)
  const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="wineFillS" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C5A572" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#C5A572" stop-opacity="0.3"/>
    </linearGradient>
  </defs>
  <!-- Wine glass -->
  <path d="M185,60 C185,60 170,250 240,280 L272,280 C342,250 327,60 327,60"
        fill="none" stroke="#722F37" stroke-width="14" stroke-linecap="round"/>
  <ellipse cx="256" cy="60" rx="71" ry="12" fill="none" stroke="#722F37" stroke-width="12"/>
  <path d="M198,170 C198,170 190,250 240,280 L272,280 C322,250 314,170 314,170 Z"
        fill="url(#wineFillS)"/>
  <rect x="249" y="280" width="14" height="65" rx="7" fill="#722F37"/>
  <ellipse cx="256" cy="352" rx="56" ry="12" fill="none" stroke="#722F37" stroke-width="12"/>
  <!-- Sparkle -->
  <path d="M350,48 L356,28 L362,48 L382,54 L362,60 L356,80 L350,60 L330,54 Z"
        fill="#C5A572"/>
  <path d="M374,20 L377,10 L380,20 L390,23 L380,26 L377,36 L374,26 L364,23 Z"
        fill="#C5A572" opacity="0.6"/>
  <!-- Text -->
  <text x="256" y="420" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
        font-weight="900" font-size="52" fill="#722F37" letter-spacing="2">SAQ Futé</text>
  <text x="256" y="455" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
        font-weight="500" font-size="18" fill="#C5A572" letter-spacing="1">Buvez mieux, dépensez moins</text>
</svg>`;

  // Favicon (simple, clean, small)
  const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#722F37"/>
  <path d="M22,12 C22,12 20,36 28,40 L36,40 C44,36 42,12 42,12"
        fill="none" stroke="#FFF8F0" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="32" cy="12" rx="10" ry="2" fill="none" stroke="#FFF8F0" stroke-width="2.5"/>
  <path d="M24,26 C24,26 23,36 28,40 L36,40 C41,36 40,26 40,26 Z"
        fill="#C5A572" opacity="0.5"/>
  <rect x="30.5" y="40" width="3" height="9" rx="1.5" fill="#FFF8F0"/>
  <ellipse cx="32" cy="50" rx="8" ry="2" fill="none" stroke="#FFF8F0" stroke-width="2.5"/>
  <path d="M46,9 L47.5,5 L49,9 L53,10.5 L49,12 L47.5,16 L46,12 L42,10.5 Z"
        fill="#C5A572"/>
</svg>`;

  // Generate all icons
  const icons = [
    { name: 'icon.png', svg: iconSvg, width: 1024, height: 1024 },
    { name: 'adaptive-icon.png', svg: adaptiveFgSvg, width: 1024, height: 1024 },
    { name: 'splash-icon.png', svg: splashSvg, width: 512, height: 512 },
    { name: 'favicon.png', svg: faviconSvg, width: 64, height: 64 },
  ];

  for (const icon of icons) {
    const outPath = path.join(outDir, icon.name);
    await sharp(Buffer.from(icon.svg))
      .resize(icon.width, icon.height)
      .png()
      .toFile(outPath);
    console.log(`  Generated: ${icon.name} (${icon.width}x${icon.height})`);
  }

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);
