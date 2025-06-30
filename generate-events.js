const fs = require('fs');
const https = require('https');
const path = require('path');

const EVENTS_URL = 'https://raw.githubusercontent.com/ALD-Models/Testing/refs/heads/main/events1.json';
const OUTPUT_DIR = './events';
const MAX_EVENTS = 10;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)){
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

// Generate slug from eventname
function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

// Generate HTML content per event
function generateHtml(event) {
  const name = event.properties.eventname;
  const longName = event.properties.EventLongName || '';
  const shortName = event.properties.EventShortName || '';
  const location = event.properties.EventLocation || '';
  const coords = event.geometry.coordinates || [];
  const latitude = coords[1] || 0;
  const longitude = coords[0] || 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>accommodation near ${name}</title>
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
    margin: 0; padding: 0; background: var(--primary-light);
    color: var(--primary-dark);
  }
  header {
    background-color: var(--primary-dark);
    color: white;
    padding: 1rem;
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
    padding: 1rem;
    gap: 1rem;
  }
  .hotels {
    flex: 1 1 400px;
    background: white;
    padding: 1rem;
    border-radius: 8px;
  }
  .hotels h2 {
    margin-top: 0;
  }
  .map-section {
    flex: 1 1 400px;
    background: white;
    padding: 1rem;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
  }
  .map-section h2 {
    margin-top: 0;
  }
  iframe {
    flex: 1;
    border: none;
    border-radius: 8px;
  }
  .directions {
    margin-top: 0.5rem;
  }
  footer {
    background-color: var(--primary-dark);
    color: white;
    padding: 1rem;
    text-align: center;
    font-size: 1rem;
  }
  .download-links {
    margin-top: 0.5rem;
  }
  .download-links a {
    margin: 0 1rem;
    display: inline-block;
  }
  .download-links img {
    height: 40px;
    vertical-align: middle;
  }
  @media(max-width: 768px) {
    main {
      flex-direction: column;
    }
    .map-section, .hotels {
      flex: 1 1 100%;
    }
    .hotels {
      order: 2;
    }
    .map-section {
      order: 1;
    }
  }
</style>
</head>
<body>
<header onclick="window.open('https://www.parkrunnertourist.co.uk', '_blank')">
  parkrunnertourist
</header>
<main>
  <section class="hotels">
    <h2>Nearby hotel prices</h2>
    <div id="stay22-hotels">
      <!-- Stay22 widget placeholder -->
      <iframe
        src="https://widgets.stay22.com/widget.html?lat=${latitude}&lng=${longitude}&zoom=13&partnerId=parkrun"
        style="width: 100%; height: 400px;"
        title="Nearby Hotels"
        allowfullscreen>
      </iframe>
    </div>
  </section>
  <section class="map-section">
    <h2>Find accommodation</h2>
    <iframe
      src="https://www.parkrunnertourist.co.uk/main"
      style="width: 100%; height: 400px;"
      title="Parkrunner Tourist Map"
      allowfullscreen>
    </iframe>
    <div class="directions">
      <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}" target="_blank" rel="noopener noreferrer">
        Click for directions
      </a>
    </div>
  </section>
</main>
<footer>
  Download the app:
  <div class="download-links">
    <a href="https://apps.apple.com/gb/app/parkrunner-tourist/id6743163993" target="_blank" rel="noopener noreferrer" aria-label="Download on the Apple App Store">
      <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Apple App Store" />
    </a>
    <a href="https://play.google.com/store/apps/details?id=co.uk.parkrunnertourist.app" target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play">
      <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play Store" />
    </a>
  </div>
</footer>
</body>
</html>`;
}

async function main() {
  try {
    console.log('Fetching events JSON...');
    const data = await fetchJson(EVENTS_URL);

    if (!data.events || !data.events.features) {
      throw new Error('Invalid events data structure');
    }

    const events = data.events.features.slice(0, MAX_EVENTS);

    for (const event of events) {
      const slug = slugify(event.properties.eventname);
      const filename = path.join(OUTPUT_DIR, `${slug}.html`);
      const htmlContent = generateHtml(event);

      fs.writeFileSync(filename, htmlContent, 'utf-8');
      console.log(`Generated: ${filename}`);
    }

    console.log(`Successfully generated ${events.length} event HTML files.`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
