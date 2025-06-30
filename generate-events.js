const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'events');
const EVENTS_FILE = path.join(__dirname, 'events.json');
const MAX_EVENTS = 10;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^a-z0-9\-]/g, '') // Remove all non-alphanumeric and non-dash chars
    .replace(/\-+/g, '-')        // Replace multiple - with single -
    .replace(/^\-+|\-+$/g, '');  // Trim - from start/end
}

function generateHTML(event) {
  const title = `accommodation near ${event.name.toLowerCase()}`;
  const description = event.description || 'Find nearby accommodation for your parkrun event.';
  const googlePlayURL = 'https://play.google.com/store/apps/details?id=uk.co.parkrunnertourist.app';
  const appStoreURL = 'https://apps.apple.com/gb/app/parkrunner-tourist/id6743163993';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display&display=swap');
  :root {
    --primary-color: #4CAF50;
    --primary-dark: #2E7D32;
    --primary-light: #E8F5E9;
  }
  body {
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    margin: 0; padding: 0;
    background-color: var(--primary-light);
    color: var(--primary-dark);
  }
  header {
    background-color: var(--primary-dark);
    padding: 1rem;
    color: white;
    font-weight: 700;
    font-size: 1.5rem;
    cursor: pointer;
  }
  header a {
    color: white;
    text-decoration: none;
  }
  main {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1rem;
  }
  .hotels {
    flex: 1 1 300px;
    background: white;
    padding: 1rem;
    border-radius: 6px;
  }
  .map {
    flex: 1 1 300px;
    background: white;
    padding: 1rem;
    border-radius: 6px;
  }
  h1 {
    text-transform: lowercase;
  }
  iframe {
    width: 100%;
    height: 300px;
    border: none;
    border-radius: 6px;
  }
  footer {
    background-color: var(--primary-dark);
    color: white;
    text-align: center;
    padding: 1rem;
  }
  .app-links img {
    height: 48px;
    margin: 0 10px;
    vertical-align: middle;
    cursor: pointer;
    filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
  }
  @media (max-width: 600px) {
    main {
      flex-direction: column;
    }
    .map {
      order: 1;
    }
    .hotels {
      order: 2;
    }
  }
</style>
</head>
<body>

<header onclick="window.open('https://www.parkrunnertourist.co.uk', '_blank')">
  parkrunnertourist
</header>

<main>
  <section class="map">
    <h2>find accommodation</h2>
    <iframe src="https://www.parkrunnertourist.co.uk/main" title="Accommodation Map"></iframe>
  </section>
  
  <section class="hotels">
    <h2>nearby hotel prices</h2>
    <p>${description}</p>
    <!-- Here you would ideally integrate Stay22 or similar hotel listings -->
    <ul>
      <li>Hotel A - £100</li>
      <li>Hotel B - £80</li>
      <li>Hotel C - £120</li>
    </ul>
  </section>
</main>

<footer>
  <div>download the app</div>
  <div class="app-links">
    <a href="${appStoreURL}" target="_blank" rel="noopener noreferrer">
      <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" />
    </a>
    <a href="${googlePlayURL}" target="_blank" rel="noopener noreferrer">
      <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" />
    </a>
  </div>
</footer>

</body>
</html>`;
}

function generateSitemap(pages) {
  const urls = pages.map(slug => {
    return `<url><loc>https://yourdomain.com/events/${slug}.html</loc></url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function main() {
  if (!fs.existsSync(EVENTS_FILE)) {
    console.error(`Missing events file: ${EVENTS_FILE}`);
    process.exit(1);
  }

  let eventsRaw = fs.readFileSync(EVENTS_FILE, 'utf-8');
  let events;

  try {
    events = JSON.parse(eventsRaw);
  } catch (e) {
    console.error('Failed to parse events.json:', e);
    process.exit(1);
  }

  if (!Array.isArray(events)) {
    console.error('Events JSON should be an array.');
    process.exit(1);
  }

  // Limit for testing
  events = events.slice(0, MAX_EVENTS);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  const generatedSlugs = [];

  events.forEach(event => {
    if (!event.name) {
      console.warn('Skipping event missing name:', event);
      return;
    }
    const slug = slugify(event.name);
    generatedSlugs.push(slug);

    const html = generateHTML(event);
    const filePath = path.join(OUTPUT_DIR, `${slug}.html`);
    fs.writeFileSync(filePath, html, 'utf-8');
    console.log(`Generated ${filePath}`);
  });

  // Generate sitemap.xml in root folder
  const sitemapContent = generateSitemap(generatedSlugs);
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapContent, 'utf-8');
  console.log('Generated sitemap.xml');
}

main();
