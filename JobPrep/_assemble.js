/**
 * Assembly script: splices all _patch_partN.js files into answers.js
 * Run with: node _assemble.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'd:/Interview';

// Read answers.js
let answers = fs.readFileSync(path.join(BASE, 'answers.js'), 'utf8');

// Find the closing `};` (last occurrence) and strip it plus trailing whitespace
// answers.js ends with: ...\n}\n\n};\n
// We need to insert before the final `\n\n};`
const lastClose = answers.lastIndexOf('\n};');
if (lastClose === -1) {
  throw new Error('Could not find closing }; in answers.js');
}

const base = answers.substring(0, lastClose); // everything before the final `\n};`

// The last entry in base ends with `}` (no trailing comma)
// We need to add a comma after the last entry, then append new entries

const patches = [
  '_patch_part1.js',
  '_patch_part2.js',
  '_patch_part3.js',
  '_patch_part4.js',
  '_patch_part5.js',
  '_patch_part6.js',
  '_patch_part7.js',
  '_patch_part8.js',
];

let newContent = base + ',\n\n';

for (const patch of patches) {
  const patchPath = path.join(BASE, patch);
  if (!fs.existsSync(patchPath)) {
    console.warn(`WARNING: ${patch} not found, skipping`);
    continue;
  }
  let patchContent = fs.readFileSync(patchPath, 'utf8');

  // Remove the leading comment line (// PATCH PART N: ...)
  patchContent = patchContent.replace(/^\/\/ PATCH PART.*\n/, '');

  // Trim trailing whitespace/newlines
  patchContent = patchContent.trim();

  // Ensure it ends with a comma for the next patch
  if (!patchContent.endsWith(',')) {
    patchContent = patchContent + ',';
  }

  newContent += patchContent + '\n\n';
  console.log(`Added ${patch}`);
}

// Remove trailing comma from very last entry
// Find the last comma before we add the closing brace
newContent = newContent.trimEnd();
if (newContent.endsWith(',')) {
  newContent = newContent.slice(0, -1);
}

newContent += '\n\n};\n';

// Write output
const outPath = path.join(BASE, 'answers.js');
fs.writeFileSync(outPath, newContent, 'utf8');

const lineCount = newContent.split('\n').length;
console.log(`\nDone! answers.js updated. Total lines: ${lineCount}`);
