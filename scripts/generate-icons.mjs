// Genera los PNG de la PWA a partir de los SVG con el Chromium de Playwright.
// Uso: node scripts/generate-icons.mjs  (requiere playwright instalado)
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const jobs = [
  ["public/icons/icon.svg", "public/icons/icon-192.png", 192],
  ["public/icons/icon.svg", "public/icons/icon-512.png", 512],
  ["public/icons/icon-maskable.svg", "public/icons/icon-maskable-512.png", 512],
  ["public/icons/icon-maskable.svg", "public/icons/apple-touch-icon.png", 180],
];

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
for (const [src, out, size] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  const svg = readFileSync(src, "utf8");
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
  await page.screenshot({ path: out, omitBackground: true });
  console.log(out);
}
await browser.close();
