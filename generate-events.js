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
          resolve(JSON.parse(data));
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

// Get next Friday date as YYYY-MM-DD
function getNextFridayDateISO() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  today.setDate(today.getDate() + daysUntilFriday);
  return today.toISOString().slice(0, 10);
}

function generateHtml(event) {
  const name = event.properties.eventname || 'Unknown event';
  const location = event.properties.EventLocation || '';
  const description = event.properties.EventDescription || 'No description available.';
  const coords = event.geometry.coordinates || [];
  const latitude = coords[1] || 0;
  const longitude = coords[0] || 0;
  const encodedName = encodeURIComponent(`${name} parkrun`);
  const checkinDate = getNextFridayDateISO();
  const pageTitle = `Accommodation near ${name} parkrun`;

  // Stay22 iframe base URL with scroll locking via scrolling="no"
  const stay22BaseUrl = `https://www.stay22.com/embed/gm?aid=parkrunnertourist&lat=${latitude}&lng=${longitude}&checkin=${checkinDate}&maincolor=7dd856&venue=${encodedName}`;

  // Main iframe URL with lat/lon and zoom=13 as requested
  const mainIframeUrl = `https://parkrunnertourist.co.uk/main?lat=${latitude}&lon=${longitude}&zoom=13`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <meta name="description" content="Find and book hotels, campsites, and cafes around ${name} parkrun." />
  <meta name="keywords" content="parkrun, accommodation, hotels, stay, tourist, ${name.toLowerCase()}" />
  <link rel="canonical" href="${BASE_URL}/${slugify(name)}.html" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .iframe-container {
      display: flex;
      flex-direction: row;
      gap: 1rem;
      flex-wrap: wrap;
    }
    iframe {
      flex: 1;
      height: 80vh;
      border-radius: 1rem;
      border: none;
      overflow: hidden;
    }
    .download-footer img {
      height: 70px;
      transition: transform 0.3s ease;
    }
    .download-footer img:hover {
      transform: scale(1.1);
    }
    .toggle-btn {
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      margin-right: 0.5rem;
      cursor: pointer;
      font-weight: bold;
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }
    .toggle-btn.active {
      background-color: #2e7d32;
      color: white;
      border-color: #1b4d22;
      font-size: 1.1rem;
    }
  </style>
</head>
<body>

<header class="flex justify-between items-center bg-green-700 text-white p-4 text-xl">
  <div>parkrunner tourist</div>
  <div>accommodation near ${name} parkrun</div>
</header>

<main class="p-6">
  <h1 class="text-2xl mb-4">Accommodation near ${name} parkrun</h1>
  <p class="mb-6">${description}</p>

  <h2 class="text-xl font-semibold mb-2">Hotel Prices</h2>
  <div class="mb-4">
    <button class="toggle-btn active" onclick="switchView('listview')" id="btn-listview">List View</button>
    <button class="toggle-btn" onclick="switchView('map')" id="btn-map">Map View</button>
    <span id="current-view" class="ml-4 text-green-700 font-bold">Currently Showing: List View</span>
  </div>

  <div class="iframe-container">
    <iframe id="stay22Frame" scrolling="no"
      src="${stay22BaseUrl}&viewmode=listview&listviewexpand=true"
      title="Stay22 accommodation listing">
    </iframe>

    <iframe src="${mainIframeUrl}" title="Parkrun Map"></iframe>
  </div>
</main>

<div class="download-footer bg-green-600 flex justify-center gap-4 p-4 mt-8">
  <div class="text-white font-bold text-lg mr-4 self-center">DOWNLOAD THE APP</div>
  <a href="https://apps.apple.com/gb/app/parkrunner-tourist/id6743163993" target="_blank" rel="noopener noreferrer">
    <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" />
  </a>
  <a href="https://play.google.com/store/apps/details?id=appinventor.ai_jlofty8.parkrunner_tourist" target="_blank" rel="noopener noreferrer">
    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" />
  </a>
</div>

<footer class="text-center py-4">
  &copy; ${new Date().getFullYear()} parkrunner tourist
</footer>

<script>
  function switchView(mode) {
    const iframe = document.getElementById('stay22Frame');
    const baseUrl = "${stay22BaseUrl}";
    iframe.src = baseUrl + "&viewmode=" + mode + "&listviewexpand=" + (mode === 'listview');
    document.getElementById('current-view').textContent = "Currently Showing: " + (mode === 'map' ? "Map View" : "List View");
    document.getElementById('btn-listview').classList.toggle('active', mode === 'listview');
    document.getElementById('btn-map').classList.toggle('active', mode === 'map');
  }
</script>

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

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    }

    for (const event of selectedEvents) {
      const slug = slugify(event.properties.eventname);
      slugs.push(slug);
      const filename = path.join(OUTPUT_DIR, `${slug}.html`);
      const htmlContent = generateHtml(event);
      fs.writeFileSync(filename, htmlContent, 'utf-8');
      console.log(`Generated: ${filename}`);
    }

    // Save sitemap.xml in root directory
    const sitemapContent = generateSitemap(slugs);
    fs.writeFileSync('./sitemap.xml', sitemapContent, 'utf-8');
    console.log('Generated sitemap.xml in root folder.');

    console.log(`Successfully generated ${selectedEvents.length} event HTML files.`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
