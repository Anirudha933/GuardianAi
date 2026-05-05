// skills/scrape.skill.ts

import { chromium, Page } from 'playwright';
import axios from 'axios';

export default async function scrape(url: string) {
  try {
    return await playwrightScrape(url);
  } catch (e) {
    console.warn('Playwright failed, falling back to axios:', e);
    return await axiosScrape(url);
  }
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
        await page.goto(full, {
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