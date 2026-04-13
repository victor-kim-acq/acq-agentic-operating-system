#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import path from 'path';

const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:3000';
const width = parseInt(args[1] || '1440', 10);
const height = parseInt(args[2] || '900', 10);
const sectionMode = args.includes('--sections');

const dir = path.resolve('tmp_screenshots');
await mkdir(dir, { recursive: true });

const now = new Date();
const ts = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width, height });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

if (sectionMode) {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const sections = Math.ceil(totalHeight / height);
  const names = ['hero', ...Array.from({ length: sections - 1 }, (_, i) => `section-${i + 1}`)];

  for (let i = 0; i < sections; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * height);
    await new Promise((r) => setTimeout(r, 300));
    const file = path.join(dir, `screenshot-${ts}-${names[i]}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
    console.log(`Saved: ${file}`);
  }
} else {
  const file = path.join(dir, `screenshot-${ts}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`Saved: ${file}`);
}

await browser.close();
