const fs = require('fs');
const https = require('https');
const path = require('path');

const EVENTS_URL = 'https://raw.githubusercontent.com/ALD-Models/Testing/refs/heads/main/events1.json';
const OUTPUT_DIR = './events';
const MAX_EVENTS = 10;
const BASE_URL = 'https://www.parkrunnertourist.co.uk/events'; // Change this to your actual site base URL

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Helper to fetch JSON from URL
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

// Generate slug from event name
function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

// Get current date in YYYY-MM-DD for checkin param
function getTodayDateISO() {
  return new Date().toISOString().slice(0, 10);
}

// Generate SEO meta description snippet (shortened description)
function getSeoDescription(text) {
  if (!text) return 'Find accommodation near this parkrun event.';
  const stripped = text.replace(/(<([^>]+)>)/gi, '').trim();
  return stripped.length > 150 ? stripped.slice(0, 147) + '...' : stripped;
}

// Generate keywords for SEO meta tag (basic from name + location)
function getSeoKeywords(name, location) {
  const base = ['parkrun', 'accommodation', 'hotel', 'stay', 'tourist', 'travel'];
  if (name) base.push(...name.toLowerCase().split(' '));
  if (location) base.push(...location.toLowerCase().split(' '));
  return Array.from(new Set(base)).join(', ');
}

// Generate HTML content per event
function generateHtml(event) {
  const name = event.properties.eventname || 'Unknown event';
  const location = event.properties.EventLocation || '';
  const description = event.properties.EventDescription || 'No description available.';
  const coords = event.geometry.coordinates || [];
  const latitude = coords[1] || 0;
  const longitude = coords[0] || 0;
  const encodedName = encodeURIComponent(name);
  const checkinDate = getTodayDateISO();

  const seoDescription = getSeoDescription(description);
  const seoKeywords = getSeoKeywords(name, location);
  const pageTitle = `Accommodation near ${name} parkrun`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle} | parkrunner tourist app</title>
  <meta name="description" content="${seoDescription}" />
  <meta name="keywords" content="${seoKeywords}" />
  <link rel="canonical" href="${BASE_URL}/${slugify(name)}.html" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --primary-color: #4CAF50;
      --primary-dark: #2E7D32;
      --primary-light: #E8F5E9;
      --text-color: #2b2b2b;
      --text-light: #4a4a4a;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
        Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      --font-sf-pro: "SF Pro Text", "SF Pro Display", "SF Pro Icons", "Helvetica Neue", sans-serif;
    }

    body {
      font-family: var(--font-sf-pro), var(--font-sans);
      background: linear-gradient(135deg, var(--primary-light), #fefefe);
      color: var(--text-color);
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    header.top-header {
      background-color: var(--primary-dark);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 1.5rem;
      color: white;
      user-select: none;
      text-transform: lowercase;
      letter-spacing: 0.06em;
      box-shadow: 0 4px 15px rgb(46 125 50 / 0.6);
    }
    header.top-header a {
      color: white;
      text-decoration: none;
      user-select: none;
    }
    header .right-title {
      font-weight: 600;
      font-size: 1rem;
      color: #c8e6c9;
      user-select: none;
      white-space: nowrap;
    }

    main {
      max-width: 960px;
      margin: 2rem auto 3rem;
      padding: 0 1rem;
      flex-grow: 1;
    }

    h1 {
      color: var(--primary-dark);
      text-transform: lowercase;
      font-weight: 800;
      font-size: 2.5rem;
      letter-spacing: 0.02em;
      margin-bottom: 0.5rem;
    }

    a.directions-link {
      display: inline-block;
      margin-bottom: 2rem;
      font-size: 1.125rem;
      color: var(--primary-dark);
      border: 2px solid var(--primary-dark);
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      transition: background-color 0.3s ease, color 0.3s ease;
      text-decoration: none;
      user-select: none;
    }
    a.directions-link:hover,
    a.directions-link:focus {
      background-color: var(--primary-dark);
      color: white;
      outline: none;
      text-decoration: none;
      box-shadow: 0 0 10px var(--primary-dark);
    }

    .event-description {
      font-size: 1.125rem;
      color: var(--text-light);
      line-height: 1.6;
      max-width: 850px;
      margin-bottom: 3rem;
      font-weight: 400;
    }

    .grid-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    @media (min-width: 768px) {
      .grid-container {
        grid-template-columns: 1fr 1fr;
      }
    }

    section {
      background: white;
      padding: 1.75rem 2rem;
      border-radius: 1rem;
      box-shadow: 0 6px 16px rgb(0 0 0 / 0.08);
      display: flex;
      flex-direction: column;
      height: 520px;
    }

    section h2 {
      margin-bottom: 1rem;
      font-weight: 700;
      font-size: 1.25rem;
      color: var(--primary-dark);
      user-select: none;
    }

    iframe {
      border: none;
      border-radius: 1rem;
      width: 100%;
      flex-grow: 1;
      min-height: 420px;
      box-shadow: 0 6px 20px rgb(0 0 0 / 0.1);
      transition: box-shadow 0.3s ease;
    }
    iframe:hover,
    iframe:focus {
      box-shadow: 0 12px 28px rgb(0 0 0 / 0.15);
      outline: none;
    }

    .download-footer {
      background: var(--primary-color);
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: center;
      gap: 2rem;
      align-items: center;
      flex-wrap: wrap;
      border-radius: 0.75rem 0.75rem 0 0;
      box-shadow: 0 0 30px rgba(76, 175, 80, 0.45);
      user-select: none;
    }
    .download-footer span {
      color: white;
      font-weight: 700;
      font-size: 1.2rem;
      margin-right: 0.8rem;
      white-space: nowrap;
    }

    .download-btn {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      background: white;
      box-shadow: 0 5px 12px rgba(0,0,0,0.12);
      transition: box-shadow 0.3s ease, transform 0.15s ease;
      text-decoration: none;
      user-select: none;
      min-height: 48px;
      gap: 0.5rem;
      font-weight: 600;
      color: var(--text-color);
    }
    .download-btn:hover,
    .download-btn:focus {
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
      transform: translateY(-2px);
      outline: none;
    }
    .download-btn img {
      height: 32px;
      width: auto;
      user-select: none;
      pointer-events: none;
    }

    footer {
      text-align: center;
      font-size: 0.9rem;
      color: var(--text-light);
      margin-top: auto;
      padding: 1.5rem 1rem 3rem;
    }
  </style>
</head>
<body>

  <header class="top-header" role="banner">
    <a href="https://www.parkrunnertourist.co.uk" target="_blank" rel="noopener noreferrer" aria-label="Visit parkrun tourist homepage">
      parkrunner tourist app
    </a>
    <div class="right-title">accommodation near ${name} parkrun</div>
  </header>

  <main>
    <h1>accommodation near ${name} parkrun</h1>

    <a
      href="https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}"
      target="_blank"
      rel="noopener noreferrer"
      class="directions-link"
      aria-label="Get directions to ${name} parkrun"
    >click for directions</a>

    <div class="event-description" aria-label="Event description">
      ${description}
    </div>

    <div class="grid-container">
      <section class="find-accommodation" aria-label="Find accommodation">
        <h2>📍 find accommodation</h2>
        <iframe
          src="https://www.parkrunnertourist.co.uk/main"
          loading="lazy"
          title="Parkrun tourist map and info"
          tabindex="0"
        ></iframe>
      </section>

      <section aria-label="Nearby hotel prices">
        <h2>🛏️ nearby hotel prices</h2>
        <iframe
          src="https://www.stay22.com/embed/gm?aid=parkrunnertourist&lat=${latitude}&lng=${longitude}&checkin=${checkinDate}&maincolor=7dd856&venue=${encodedName}&viewmode=listview&listviewexpand=true"
          loading="lazy"
          title="Nearby hotels list"
          tabindex="0"
        ></iframe>
      </section>
    </div>
  </main>

  <div class="download-footer" role="contentinfo" aria-label="Download the parkrun tourist app">
    <span>Download the app:</span>

    <a href="https://apps.apple.com/gb/app/parkrunner-tourist/id6743163993" target="_blank" rel="noopener noreferrer" class="download-btn" aria-label="Download on the App Store">
      <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" />
      App Store
    </a>

    <a href="https://play.google.com/store/apps/details?id=uk.co.parkrunnertourist" target="_blank" rel="noopener noreferrer" class="download-btn" aria-label="Download on Google Play">
      <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" />
      Google Play
    </a>
  </div>

  <footer>
    &copy; ${new Date().getFullYear()} parkrunner tourist app
  </footer>

</body>
</html>`;
}

// Generate sitemap.xml
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
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                      http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
>
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

    // Generate sitemap.xml in output directory
    const sitemapContent = generateSitemap(slugs);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemapContent, 'utf-8');
    console.log('Generated sitemap.xml');

    console.log(`Successfully generated ${selectedEvents.length} event HTML files.`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
