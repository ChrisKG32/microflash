#!/usr/bin/env node
/**
 * Post-build script to fix @/generated/prisma imports in compiled JS files.
 *
 * tsc-alias doesn't handle the generated Prisma client path because it's a
 * JS package (not compiled TS). This script rewrites those imports to use
 * relative paths that work at runtime.
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('@/generated/prisma')) {
    return false;
  }

  // Calculate relative path from this file to dist/generated/prisma
  const fileDir = path.dirname(filePath);
  const prismaDir = path.join(distDir, 'generated', 'prisma');
  let relativePath = path.relative(fileDir, prismaDir);

  // Ensure it starts with ./ for Node resolution
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  // Replace all occurrences
  const newContent = content.replace(/@\/generated\/prisma/g, relativePath);
  fs.writeFileSync(filePath, newContent, 'utf8');

  console.log(`Fixed: ${path.relative(distDir, filePath)}`);
  return true;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      count += walkDir(filePath);
    } else if (file.endsWith('.js')) {
      if (processFile(filePath)) {
        count++;
      }
    }
  }

  return count;
}

console.log('Fixing @/generated/prisma imports...');
const count = walkDir(distDir);
console.log(`Done. Fixed ${count} file(s).`);
