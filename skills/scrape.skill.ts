// skills/scrape.skill.ts

import { chromium, Page } from 'playwright';
import axios from 'axios';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

export default async function scrape(url: string) {
  const safeUrl = await validateScrapeUrl(url);

  try {
    return await playwrightScrape(safeUrl);
  } catch (e) {
    console.warn('Playwright failed, falling back to axios:', e);
    return await axiosScrape(safeUrl);
  }
}

export async function validateScrapeUrl(url: string): Promise<string> {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid URL protocol');
  }

  if (isBlockedHost(parsed.hostname)) {
    throw new Error('Blocked private or local URL');
  }

  if (!isIP(parsed.hostname)) {
    const records = await lookup(parsed.hostname, { all: true });
    if (records.some(record => isBlockedHost(record.address))) {
      throw new Error('Blocked private or local URL');
    }
  }

  return parsed.href;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const ipVersion = isIP(host);

  if (host === 'localhost' || host.endsWith('.localhost')) return true;

  if (ipVersion === 6) {
    return (
      host === '::1' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe80:')
    );
  }

  if (ipVersion !== 4) return false;

  const parts = host.split('.').map(Number);
  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function playwrightScrape(url: string) {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 20000,
    });

    const dom = (await page.innerText('body')).slice(0, 8000);
    const tos = await findTos(page, url);

    return { dom, tos, source: 'playwright' };

  } finally {
    // 🔥 prevents memory leaks in PM2/VPS
    await browser.close();
  }
}

async function findTos(page: Page, baseUrl: string): Promise<string> {
  const keywords = [
    'terms',
    'tos',
    'terms-of-service',
    'terms-and-conditions',
    'privacy',
    'policy',
    'legal',
  ];

  for (const kw of keywords) {
    const links = await page.$$(`a[href*="${kw}"]`);

    if (links.length > 0) {
      const href = await links[0].getAttribute('href');

      if (!href) continue;

      const full = href.startsWith('http')
        ? href
        : new URL(href, baseUrl).href;

      try {
        const safeFull = await validateScrapeUrl(full);

        await page.goto(safeFull, {
          waitUntil: 'networkidle',
          timeout: 15000,
        });

        return (await page.innerText('body')).slice(0, 20000);
      } catch {
        continue;
      }
    }
  }

  return '';
}

async function axiosScrape(url: string) {
  const r = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GuardianAI/1.0)',
    },
  });

  return {
    dom: String(r.data).slice(0, 8000),
    tos: '',
    source: 'axios',
  };
}
