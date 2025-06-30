const fs = require('fs');
const path = require('path');
const https = require('https');

const EVENTS_URL = 'https://raw.githubusercontent.com/ALD-Models/Testing/refs/heads/main/events1.json';
const OUTPUT_DIR = path.join(process.cwd(), 'events');
const MAX_EVENTS = 10; // for testing limit

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

async function main() {
  try {
    const data = await fetchJSON(EVENTS_URL);

    if (!data.events || !Array.isArray(data.events.features)) {
      console.error('Invalid data structure: "events.features" array missing');
      process.exit(1);
    }

    const features = data.events.features.slice(0, MAX_EVENTS);

    fs.readdirSync(OUTPUT_DIR).forEach(file => {
      if (file.endsWith('.html')) fs.unlinkSync(path.join(OUTPUT_DIR, file));
    });

    features.forEach(feature => {
      const props = feature.properties || {};
      const eventName = props.EventLongName || props.eventname || 'unknown-event';
      const eventShortName = props.EventShortName || '';
      const eventLocation = props.EventLocation || '';
      const slug = slugify(eventName);

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>accommodation near ${eventName.toLowerCase()}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif; margin: 20px; background-color: #E8F5E9; color: #2E7D32; }
    header { font-weight: bold; font-size: 2em; color: #2E7D32; cursor: pointer; margin-bottom: 1em; }
    footer { margin-top: 3em; font-size: 0.9em; color: #4CAF50; }
    .download-links img { width: 140px; margin-right: 1em; vertical-align: middle; }
    a { color: #4CAF50; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header onclick="window.open('https://www.parkrunnertourist.co.uk','_blank')">parkrunner tourist</header>
  <h1>accommodation near ${eventName.toLowerCase()}</h1>
  <p><strong>Location:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventLocation)}" target="_blank">click for directions</a></p>
  <p>${eventShortName ? `<em>${eventShortName}</em>` : ''}</p>

  <iframe src="https://www.parkrunnertourist.co.uk/main" style="width:100%; height:300px; border:none;"></iframe>

  <footer>
    <div>download the app:</div>
    <div class="download-links">
      <a href="https://apps.apple.com/gb/app/parkrunner-tourist/id6743163993" target="_blank" aria-label="Download on the Apple App Store">
        <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" />
      </a>
      <a href="https://play.google.com/store/apps/details?id=com.parkrunner.tourist" target="_blank" aria-label="Get it on Google Play">
        <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" />
      </a>
    </div>
  </footer>
</body>
</html>`;

      fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.html`), html, 'utf-8');
      console.log(`Generated ${slug}.html`);
    });

    const sitemapUrls = features.map(f => {
      const slug = slugify(f.properties.EventLongName || f.properties.eventname || 'unknown-event');
      return `<url><loc>https://yourdomain.com/events/${slug}.html</loc></url>`;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>`;

    fs.writeFileSync(path.join(process.cwd(), 'sitemap.xml'), sitemap, 'utf-8');
    console.log('Generated sitemap.xml');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
