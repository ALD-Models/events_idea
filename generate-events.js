const fs = require('fs');
const https = require('https');
const path = require('path');

const EVENTS_URL = 'https://raw.githubusercontent.com/ALD-Models/Testing/refs/heads/main/events1.json';
const OUTPUT_DIR = './events';
const MAX_EVENTS = 10;
const BASE_URL = 'https://www.parkrunnertourist.co.uk/events';

// Helper: fetch JSON over HTTPS
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

// Slugify event name for URLs
function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

// Get next Friday date ISO string (YYYY-MM-DD)
function getNextFridayDateISO() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  today.setDate(today.getDate() + daysUntilFriday);
  return today.toISOString().slice(0, 10);
}

// Stub for fetching Wikipedia description about the parkrun location.
// In a real environment, you might call a Wikipedia API or scrape pages.
// This just simulates async behavior and returns null to fallback to event description.
async function fetchWikipediaDescription(eventName) {
  // Example: map eventName "Bushy Park" -> wikipedia URL: https://en.wikipedia.org/wiki/Bushy_Park
  // Then scrape or call API for extract about the parkrun.
  // For now, return null to use fallback
  return null;
}

// Generate the HTML content for each event page
async function generateHtml(event) {
  const name = event.properties.eventname || 'Unknown event';
  const location = event.properties.EventLocation || '';
  const coords = event.geometry.coordinates || [];
  const latitude = coords[1] || 0;
  const longitude = coords[0] || 0;
  const encodedName = encodeURIComponent(`${name} parkrun`);
  const checkinDate = getNextFridayDateISO();
  const pageTitle = `Accommodation near ${name} parkrun`;

  // Try to get Wikipedia description
  let description = event.properties.EventDescription || 'No description available.';
  const wikiDesc = await fetchWikipediaDescription(name);
  if (wikiDesc && wikiDesc.length > 50) {
    // Embed the Wikipedia description with a mention & link
    description = `<p>${wikiDesc}</p><p><em>Source: <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, '_'))}" target="_blank" rel="noopener noreferrer">Wikipedia</a></em></p>`;
  } else {
    // Just escape HTML for safety
    description = `<p>${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
  }

  // Stay22 iframe base URL with scroll locking via scrolling="no"
  const stay22BaseUrl = `https://www.stay22.com/embed/gm?aid=parkrunnertourist&lat=${latitude}&lng=${longitude}&checkin=${checkinDate}&maincolor=7dd856&venue=${encodedName}`;

  // Main iframe URL with lat/lon and zoom=13 as requested
  const mainIframeUrl = `https://parkrunnertourist.co.uk/main?lat=${latitude}&lon=${longitude}&zoom=13`;

  // Weather iframe URL
  const weatherIframeUrl = `https://parkrunnertourist.co.uk/weather?lat=${latitude}&lon=${longitude}`;

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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 0; 
      padding: 0;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      line-height: 1.6;
    }
    
    header {
      background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
      color: white;
      padding: 1.5rem 2rem;
      font-weight: 600;
      font-size: 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px rgba(46, 125, 50, 0.3);
      position: relative;
      overflow: hidden;
    }
    
    header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.1)"/></svg>');
      pointer-events: none;
    }
    
    header a {
      color: white;
      text-decoration: none;
      cursor: pointer;
      position: relative;
      z-index: 1;
      transition: transform 0.3s ease;
    }
    
    header a:hover {
      transform: translateY(-2px);
    }
    
    main {
      padding: 3rem 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, #2e7d32, #4caf50);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-align: center;
    }
    
    .description {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
      border: 1px solid rgba(76, 175, 80, 0.2);
    }
    
    .description p {
      margin: 0;
      color: #374151;
      font-size: 1.1rem;
    }
    
    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #1f2937;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .section-title::before {
      content: '';
      width: 4px;
      height: 1.5rem;
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      border-radius: 2px;
    }
    
    .toggle-controls {
      background: white;
      padding: 1.5rem;
      border-radius: 1rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
      border: 1px solid rgba(76, 175, 80, 0.2);
    }
    
    .toggle-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      margin-right: 1rem;
      cursor: pointer;
      font-weight: 600;
      border: 2px solid #4caf50;
      transition: all 0.3s ease;
      background-color: white;
      color: #4caf50;
      user-select: none;
      font-size: 1rem;
      box-shadow: 0 2px 10px rgba(76, 175, 80, 0.2);
    }
    
    .toggle-btn:hover:not(.active) {
      background-color: #f1f8e9;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
    }
    
    .toggle-btn.active {
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
    }
    
    .iframe-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }
    
    .iframe-container {
      background: white;
      border-radius: 1rem;
      padding: 1rem;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      border: 1px solid rgba(76, 175, 80, 0.2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      overflow: hidden;
    }
    
    .iframe-container:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    }
    
    .iframe-label {
      font-weight: 600;
      color: #2e7d32;
      margin-bottom: 0.75rem;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .iframe-label::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #4caf50;
      border-radius: 50%;
    }
    
    iframe {
      width: 100%;
      height: 500px;
      border-radius: 0.75rem;
      border: none;
      overflow: hidden;
    }
    
    .weather-section {
      grid-column: 1 / -1;
      margin-bottom: 2rem;
    }
    
    .weather-iframe {
      height: 300px;
    }
    
    /* Download footer */
    .download-footer {
      background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
      padding: 3rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      color: white;
      font-weight: 700;
      font-size: 1.3rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      position: relative;
      overflow: hidden;
    }
    
    .download-footer::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="25" cy="25" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="45" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="45" cy="75" r="1" fill="rgba(255,255,255,0.1)"/></svg>');
      pointer-events: none;
    }
    
    .app-badges {
      display: flex;
      gap: 2rem;
      position: relative;
      z-index: 1;
    }
    
    .download-footer img {
      height: 70px;
      width: auto;
      background: none;
      transition: transform 0.3s ease, filter 0.3s ease;
      cursor: pointer;
      border-radius: 0.5rem;
    }
    
    .download-footer img:hover {
      transform: scale(1.1) translateY(-4px);
      filter: brightness(1.1);
    }
    
    footer {
      text-align: center;
      padding: 2rem;
      background: #f8fafc;
      color: #64748b;
      font-weight: 500;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .iframe-grid {
        grid-template-columns: 1fr;
      }
      
      main {
        padding: 2rem 1rem;
      }
      
      h1 {
        font-size: 2rem;
      }
      
      header {
        padding: 1rem;
        font-size: 1.5rem;
      }
      
      .toggle-btn {
        margin-bottom: 0.5rem;
        margin-right: 0.5rem;
      }
      
      .app-badges {
        flex-direction: column;
        gap: 1rem;
      }
      
      iframe {
        height: 400px;
      }
      
      .weather-iframe {
        height: 250px;
      }
    }
    
    /* Loading animation for iframes */
    @keyframes shimmer {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
    
    .iframe-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.1), transparent);
      background-size: 200px 100%;
      animation: shimmer 2s infinite;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
  </style>
</head>
<body>

<header>
  <a href="https://www.parkrunnertourist.co.uk" target="_self" title="Go to parkrunner tourist homepage">🏃‍♂️ parkrunner tourist</a>
  <div></div>
</header>

<main>
  <h1>🏨 Accommodation near ${name} parkrun</h1>
  
  <div class="description">
    ${description}
  </div>

  <div class="weather-section">
    <div class="iframe-container">
      <div class="iframe-label">🌤️ Weather Forecast</div>
      <iframe class="weather-iframe" src="${weatherIframeUrl}" title="Weather forecast for ${name}"></iframe>
    </div>
  </div>

  <div class="toggle-controls">
    <h2 class="section-title">🏨 Hotel Prices</h2>
    <div>
      <button class="toggle-btn active" onclick="switchView('listview')" id="btn-listview">📋 List View</button>
      <button class="toggle-btn" onclick="switchView('map')" id="btn-map">🗺️ Map View</button>
    </div>
  </div>

  <div class="iframe-grid">
    <div class="iframe-container">
      <div class="iframe-label">🏨 Accommodation</div>
      <iframe id="stay22Frame" scrolling="no"
        src="${stay22BaseUrl}&viewmode=listview&listviewexpand=true"
        title="Stay22 accommodation listing">
      </iframe>
    </div>

    <div class="iframe-container">
      <div class="iframe-label">🗺️ Parkrun Location</div>
      <iframe src="${mainIframeUrl}" title="Parkrun Map"></iframe>
    </div>
  </div>
</main>

<div class="download-footer">
  📱 Download The App
  <div class="app-badges">
    <a href="https://apps.apple.com/gb/app/parkrunner-tourist/id6743163993" target="_blank" rel="noopener noreferrer">
      <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" />
    </a>
    <a href="https://play.google.com/store/apps/details?id=appinventor.ai_jlofty8.parkrunner_tourist" target="_blank" rel="noopener noreferrer">
      <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" />
    </a>
  </div>
</div>

<footer>
  &copy; ${new Date().getFullYear()} parkrunner tourist - Find your next running adventure
</footer>

<script>
  function switchView(mode) {
    const iframe = document.getElementById('stay22Frame');
    const baseUrl = "${stay22BaseUrl}";
    iframe.src = baseUrl + "&viewmode=" + mode + "&listviewexpand=" + (mode === 'listview');
    document.getElementById('btn-listview').classList.toggle('active', mode === 'listview');
    document.getElementById('btn-map').classList.toggle('active', mode === 'map');
  }
  
  // Add loading states for iframes
  document.addEventListener('DOMContentLoaded', function() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const container = iframe.closest('.iframe-container');
      iframe.addEventListener('load', function() {
        if (container) {
          container.style.background = 'white';
        }
      });
    });
  });
</script>

</body>
</html>`;
}

// Sitemap XML generator
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
      const htmlContent = await generateHtml(event);
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
