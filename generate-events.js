const fs = require('fs');
const https = require('https');
const path = require('path');

const EVENTS_URL = 'https://raw.githubusercontent.com/ALD-Models/Testing/refs/heads/main/events1.json';
const OUTPUT_DIR = './events';
const MAX_EVENTS = 10;
const BASE_URL = 'https://www.parkrunnertourist.co.uk/events';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => reject(err));
  });
}

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

function getTodayDateISO() {
  return new Date().toISOString().slice(0, 10);
}

function getSeoDescription(name) {
  return `Find and book hotels, campsites, and cafes near ${name} parkrun.`;
}

function getSeoKeywords(name, location) {
  const base = ['parkrun', 'accommodation', 'hotel', 'stay', 'tourist', 'travel'];
  if (name) base.push(...name.toLowerCase().split(' '));
  if (location) base.push(...location.toLowerCase().split(' '));
  return Array.from(new Set(base)).join(', ');
}

function generateHtml(event) {
  const name = event.properties.eventname || 'Unknown event';
  const location = event.properties.EventLocation || '';
  const description = event.properties.EventDescription || 'No description available.';
  const coords = event.geometry.coordinates || [];
  const latitude = coords[1] || 0;
  const longitude = coords[0] || 0;
  const encodedName = encodeURIComponent(name);
  const checkinDate = getTodayDateISO();
  const pageTitle = `Accommodation near ${name} parkrun`;

  const seoDescription = getSeoDescription(name);
  const seoKeywords = getSeoKeywords(name, location);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <meta name="description" content="${seoDescription}" />
  <meta name="keywords" content="${seoKeywords}" />
  <link rel="canonical" href="${BASE_URL}/${slugify(name)}.html" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    header {
      background-color: #2e7d32;
      color: white;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 1.5rem;
    }
    main {
      padding: 2rem;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    .iframe-container {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .iframe-container iframe {
      flex: 1 1 48%;
      min-height: 500px;
      border: none;
      border-radius: 1rem;
    }
    @media (max-width: 768px) {
      .iframe-container iframe {
        flex: 1 1 100%;
      }
    }
    .download-section {
      background-color: #4caf50;
      padding: 2rem;
      text-align: center;
    }
    .download-section h2 {
      font-size: 1.5rem;
      color: white;
      margin-bottom: 1rem;
    }
    .store-logos {
      display: flex;
      justify-content: center;
      gap: 2rem;
      flex-wrap: wrap;
    }
    .store-logos img {
      height: 70px;
      transition: transform 0.3s;
    }
    .store-logos img:hover {
      transform: scale(1.1);
    }
    footer {
      text-align: center;
      padding: 1rem;
      background-color: #eee;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>

  <header>
    <div>parkrunner tourist</div>
    <div>accommodation near ${name} parkrun</div>
  </header>

  <main>
    <h1>Accommodation near ${name} parkrun</h1>
    <p>${description}</p>

    <div class="iframe-container">
      <iframe src="https://www.parkrunnertourist.co.uk/main" title="Map view of cafes/campsites"></iframe>
      <iframe src="https://www.stay22.com/embed/gm?aid=parkrunnertourist&lat=${latitude}&lng=${longitude}&checkin=${checkinDate}&maincolor=7dd856&venue=${encodedName}&viewmode=listview&listviewexpand=true" title="Stay22 accommodation list"></iframe>
    </div>
  </main>

  <div class="download-section">
    <h2>Download the app</h2>
    <div class="store-logos">
      <a href="https://apps.apple.com/gb/app/parkrunner-tourist/id6743163993" target="_blank" rel="noopener noreferrer">
        <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store">
      </a>
      <a href="https://play.google.com/store/apps/details?id=appinventor.ai_jlofty8.parkrunner_tourist" target="_blank" rel="noopener noreferrer">
        <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play">
      </a>
    </div>
  </div>

  <footer>
    &copy; ${new Date().getFullYear()} parkrunner tourist
  </footer>

</body>
</html>`;
}

function generateSitemap(slugs) {
  const today = new Date().toISOString().slice(0, 10);
  const urlset = slugs.map(slug => `
    <url>
      <loc>${BASE_URL}/${slug}.html</loc>
      <lastmod>${today}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.6</priority>
    </url>
  `).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;
}

async function main() {
  try {
    console.log('Fetching events JSON...');
    const data = await fetchJson(EVENTS_URL);

    let events;
    if (Array.isArray(data)) {
      events = data;
    } else if (Array.isArray(data.features)) {
      events = data.features;
    } else if (data.events && Array.isArray(data.events.features)) {
      events = data.events.features;
    } else {
      throw new Error('Unexpected JSON structure');
    }

    const selectedEvents = events.slice(0, MAX_EVENTS);
    const slugs = [];

    for (const event of selectedEvents) {
      const slug = slugify(event.properties.eventname);
      slugs.push(slug);
      const filename = path.join(OUTPUT_DIR, `${slug}.html`);
      const htmlContent = generateHtml(event);
      fs.writeFileSync(filename, htmlContent, 'utf-8');
      console.log(`Generated: ${filename}`);
    }

    const sitemapContent = generateSitemap(slugs);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemapContent, 'utf-8');
    console.log('Generated sitemap.xml');

    console.log(`Successfully generated ${selectedEvents.length} event HTML files.`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
