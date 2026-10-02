const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 8080;
const BASE_DIR = __dirname;
const GENERATED_DIR = path.join(BASE_DIR, 'generated');
const DB_PATH = path.join(BASE_DIR, 'comiccraft.db');

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// Initialize SQLite Database
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS comics (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    prompt TEXT,
    character_name TEXT,
    setting TEXT,
    tone TEXT,
    art_style TEXT,
    panels_count INTEGER,
    panels_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('Database connected: comiccraft.db');

// Helper to parse multipart & form data
function parseFormData(bodyBuffer, contentType) {
  const fields = {};
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = bodyBuffer.toString('utf8');
    const params = new URLSearchParams(text);
    for (const [key, value] of params.entries()) {
      fields[key] = value;
    }
  } else if (contentType.includes('multipart/form-data')) {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1] || boundaryMatch[2];
      const parts = bodyBuffer.toString('binary').split('--' + boundary);
      for (const part of parts) {
        if (part.includes('Content-Disposition')) {
          const nameMatch = part.match(/name="([^"]+)"/);
          if (nameMatch) {
            const name = nameMatch[1];
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd !== -1) {
              let value = part.slice(headerEnd + 4);
              if (value.endsWith('\r\n')) {
                value = value.slice(0, -2);
              }
              fields[name] = Buffer.from(value, 'binary').toString('utf8');
            }
          }
        }
      }
    }
  } else if (contentType.includes('application/json')) {
    try {
      Object.assign(fields, JSON.parse(bodyBuffer.toString('utf8')));
    } catch (e) {}
  }
  return fields;
}

// SVG Comic Panel Generator
function createComicPanelSVG(panelNumber, title, character, setting, style, tone) {
  const colorPalettes = {
    anime: ['#1e1b4b', '#4338ca', '#6366f1', '#a5b4fc', '#fb7185'],
    'comic book': ['#7f1d1d', '#b91c1c', '#ef4444', '#f87171', '#fef08a'],
    cartoon: ['#065f46', '#047857', '#10b981', '#6ee7b7', '#fde047'],
    watercolor: ['#0c4a6e', '#0369a1', '#38bdf8', '#7dd3fc', '#fbcfe8'],
    'fantasy illustration': ['#581c87', '#7e22ce', '#a855f7', '#c084fc', '#fef08a'],
    manga: ['#18181b', '#27272a', '#52525b', '#a1a1aa', '#f4f4f5']
  };

  const palette = colorPalettes[style.toLowerCase()] || colorPalettes['comic book'];
  const bg1 = palette[0];
  const bg2 = palette[1];
  const accent = palette[2];
  const highlight = palette[4];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
      <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="2" fill="${accent}" opacity="0.25"/>
      </pattern>
    </defs>
    <rect width="800" height="600" fill="url(#bgGrad)"/>
    <rect width="800" height="600" fill="url(#dots)"/>

    <!-- Dynamic Art Shapes -->
    <circle cx="400" cy="260" r="180" fill="${accent}" opacity="0.4"/>
    <polygon points="400,100 450,220 570,220 470,290 510,410 400,330 290,410 330,290 230,220 350,220" fill="${highlight}" opacity="0.3"/>

    <!-- Panel Border -->
    <rect x="20" y="20" width="760" height="560" fill="none" stroke="#ffffff" stroke-width="8" rx="16"/>

    <!-- Header Tag -->
    <rect x="40" y="40" width="220" height="48" fill="#000000" opacity="0.75" rx="8"/>
    <text x="55" y="72" font-family="sans-serif" font-size="22" font-weight="bold" fill="${highlight}">PANEL ${panelNumber}</text>

    <!-- Character Silhouette / Icon -->
    <g transform="translate(400, 270)">
      <circle cx="0" cy="-40" r="50" fill="${highlight}"/>
      <path d="M-80,80 Q0,-10 80,80 Z" fill="${highlight}"/>
      <text x="0" y="-32" font-family="sans-serif" font-size="36" text-anchor="middle">🎨</text>
    </g>

    <!-- Style & Setting Badge -->
    <rect x="40" y="500" width="720" height="60" fill="#000000" opacity="0.7" rx="8"/>
    <text x="60" y="538" font-family="sans-serif" font-size="20" font-weight="600" fill="#ffffff">${character} in ${setting} (${style.toUpperCase()} • ${tone.toUpperCase()})</text>
  </svg>`;
}

// Fallback Story Generator
function generateFallbackStory(data) {
  const name = data.character_name || 'Hero';
  const setting = data.setting || 'Adventure Realm';
  const tone = data.tone || 'adventurous';
  const style = data.art_style || 'comic book';
  const prompt = data.prompt || 'An epic story';
  const count = parseInt(data.panels) || 4;

  const templates = [
    {
      title: "The First Step",
      narration: `${name} arrives at ${setting}, ready for the adventure: "${prompt}".`,
      dialogue: `${name}: "Something tells me this journey is only beginning!"`
    },
    {
      title: "A Strange Discovery",
      narration: `A sudden clue in ${setting} reveals a hidden secret.`,
      dialogue: `${name}: "I have never seen anything like this before!"`
    },
    {
      title: "The Challenge",
      narration: `The path forward grows dangerous, testing ${name}'s resolve.`,
      dialogue: `${name}: "Whatever comes next, I won't back down!"`
    },
    {
      title: "A New Beginning",
      narration: `With courage, ${name} resolves the mystery of ${setting}.`,
      dialogue: `${name}: "This is just the start of a legendary story!"`
    },
    {
      title: "The Hidden Power",
      narration: `${name} unlocks an ancient artifact glowing with power.`,
      dialogue: `${name}: "The energy here is incredible!"`
    },
    {
      title: "Unexpected Ally",
      narration: `A strange companion joins ${name} to help face the challenge.`,
      dialogue: `${name}: "Together, we can achieve anything!"`
    },
    {
      title: "The Final Stand",
      narration: `The climax reaches its peak as ${name} stands firm.`,
      dialogue: `${name}: "It's now or never!"`
    },
    {
      title: "Victory & Peace",
      narration: `${setting} is saved, and a new horizon awaits.`,
      dialogue: `${name}: "Onward to the next adventure!"`
    }
  ];

  const panels = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    panels.push({
      title: template.title,
      narration: template.narration,
      dialogue: template.dialogue
    });
  }

  return {
    title: `${name}'s ${tone.charAt(0).toUpperCase() + tone.slice(1)} Tale`,
    panels
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // GET / -> Serve templates/index.html
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    const indexPath = path.join(BASE_DIR, 'templates', 'index.html');
    fs.readFile(indexPath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading index.html');
        return;
      }
      const html = content.replace(/\{\{\s*url_for\('static',\s*path='([^']+)'\)\s*\}\}/g, '/static/$1');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
    return;
  }

  // GET /health
  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', database: 'connected', service: 'ComicCraft Node + SQLite Server' }));
    return;
  }

  // GET /api/comics -> List all comics stored in database
  if (req.method === 'GET' && pathname === '/api/comics') {
    try {
      const stmt = db.prepare('SELECT id, title, prompt, character_name, setting, tone, art_style, panels_count, created_at FROM comics ORDER BY created_at DESC');
      const rows = stmt.all();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', count: rows.length, comics: rows }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // GET /api/comics/:id -> Retrieve a comic by ID
  if (req.method === 'GET' && pathname.startsWith('/api/comics/')) {
    const id = pathname.replace('/api/comics/', '');
    try {
      const stmt = db.prepare('SELECT * FROM comics WHERE id = ?');
      const row = stmt.get(id);
      if (!row) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Comic not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        comic_id: row.id,
        title: row.title,
        prompt: row.prompt,
        character_name: row.character_name,
        setting: row.setting,
        tone: row.tone,
        art_style: row.art_style,
        panels: JSON.parse(row.panels_json),
        created_at: row.created_at
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Static File Serving
  if (req.method === 'GET' && (pathname.startsWith('/static/') || pathname.startsWith('/generated/'))) {
    const relativePath = pathname.slice(1);
    const filePath = path.join(BASE_DIR, relativePath);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // POST /api/generate (Generate story + Save to SQLite Database)
  if (req.method === 'POST' && pathname === '/api/generate') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      const data = parseFormData(buffer, contentType);

      const comicId = crypto.randomBytes(8).toString('hex');
      const story = generateFallbackStory(data);

      const panels = [];
      const imageCount = story.panels.length;

      for (let i = 0; i < imageCount; i++) {
        const panelData = story.panels[i];
        const svgContent = createComicPanelSVG(
          i + 1,
          panelData.title,
          data.character_name || 'Hero',
          data.setting || 'Realm',
          data.art_style || 'comic book',
          data.tone || 'adventurous'
        );

        const svgFileName = `${comicId}_panel_${i + 1}.svg`;
        const svgPath = path.join(GENERATED_DIR, svgFileName);
        fs.writeFileSync(svgPath, svgContent, 'utf8');

        panels.push({
          title: panelData.title,
          narration: panelData.narration,
          dialogue: panelData.dialogue,
          image_url: `/generated/${svgFileName}`
        });
      }

      // Save into Database
      try {
        const insertStmt = db.prepare(`
          INSERT INTO comics (id, title, prompt, character_name, setting, tone, art_style, panels_count, panels_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertStmt.run(
          comicId,
          story.title,
          data.prompt || '',
          data.character_name || '',
          data.setting || '',
          data.tone || '',
          data.art_style || '',
          panels.length,
          JSON.stringify(panels)
        );
        console.log(`Saved comic ${comicId} to Database.`);
      } catch (err) {
        console.error('Failed to save comic to DB:', err);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        comic_id: comicId,
        title: story.title,
        panels: panels,
        database: "saved",
        notice: "AI-generated comic story saved to SQLite database."
      }));
    });
    return;
  }

  // POST /api/export
  if (req.method === 'POST' && pathname === '/api/export') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      const data = parseFormData(buffer, contentType);

      const comicId = data.comic_id || 'export';
      const title = data.title || 'My Comic';
      let panels = [];
      try {
        panels = JSON.parse(data.panels_json || '[]');
      } catch (e) {}

      const printableHtml = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; background: #121214; color: #ffffff; }
          h1 { text-align: center; color: #f59e0b; margin-bottom: 30px; font-size: 2.5rem; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; max-width: 1000px; margin: 0 auto; }
          .panel { background: #1e1e24; border: 2px solid #33333e; border-radius: 12px; overflow: hidden; padding: 16px; }
          .panel img { width: 100%; height: auto; border-radius: 8px; border: 1px solid #444; }
          .panel h3 { color: #38bdf8; margin: 12px 0 8px 0; }
          .narration { font-style: italic; color: #94a3b8; margin-bottom: 8px; font-size: 0.95rem; }
          .dialogue { font-weight: bold; color: #fde047; background: #272730; padding: 8px 12px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>🎨 ${title}</h1>
        <div class="grid">
          ${panels.map((p, idx) => `
            <div class="panel">
              <img src="${p.image_url}" alt="Panel ${idx + 1}"/>
              <h3>Panel ${idx + 1}: ${p.title}</h3>
              <div class="narration">${p.narration}</div>
              <div class="dialogue">${p.dialogue}</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>`;

      const exportFileName = `ComicCraft_${comicId}.html`;
      const exportPath = path.join(GENERATED_DIR, exportFileName);
      fs.writeFileSync(exportPath, printableHtml, 'utf8');

      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${exportFileName}"`
      });
      res.end(printableHtml);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`ComicCraft Server connected to SQLite (comiccraft.db) on http://localhost:${PORT}`);
});
