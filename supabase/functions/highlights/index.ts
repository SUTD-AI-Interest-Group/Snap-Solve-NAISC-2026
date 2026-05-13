// @ts-nocheck — Deno runtime, not Node/TS-checked by the SvelteKit pipeline.
// The function runs in Supabase's Deno environment; `Deno`, `Deno.serve`,
// etc. are provided by the platform.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const gameId = segments[segments.length - 1] ?? '';

  if (!UUID_RE.test(gameId)) {
    return htmlResponse(notFoundHtml('Invalid highlight reel link'), 400);
  }

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .select('id, p1_name, p2_name, winner, duration_ms, visits')
    .eq('id', gameId)
    .single();
  if (gameErr || !game) {
    return htmlResponse(notFoundHtml('Highlight reel not found or expired'), 404);
  }

  await supabase.rpc('increment_game_visits', { game_id: gameId });

  const { data: highlights } = await supabase
    .from('highlights')
    .select('kind, player, storage_path, caption')
    .eq('game_id', gameId)
    .order('kind');

  const withUrls = (highlights ?? []).map((h) => ({
    ...h,
    url: supabase.storage.from('highlights').getPublicUrl(h.storage_path).data.publicUrl
  }));

  return htmlResponse(renderHtml(game, withUrls), 200);
});

type GameRow = {
  id: string;
  p1_name: string;
  p2_name: string;
  winner: string;
  duration_ms: number;
  visits: number;
};

type HighlightRow = {
  kind: string;
  player: string;
  storage_path: string;
  caption: string;
  url: string;
};

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function renderHtml(game: GameRow, highlights: HighlightRow[]): string {
  const winnerLabel =
    game.winner === 'draw'
      ? "It's a draw!"
      : game.winner === 'p1'
        ? `${escapeHtml(game.p1_name)} wins`
        : `${escapeHtml(game.p2_name)} wins`;
  const seconds = (game.duration_ms / 1000).toFixed(1);
  const cards = highlights
    .map(
      (h) => `
      <article class="card">
        <img src="${escapeAttr(h.url)}" alt="${escapeAttr(h.caption)}" loading="lazy" />
        <p class="caption">${escapeHtml(h.caption)}</p>
        <a href="${escapeAttr(h.url)}" download="snap-solve-${escapeAttr(h.kind)}.gif" class="dl">↓ Download</a>
      </article>
    `
    )
    .join('');

  const emptyState =
    highlights.length === 0
      ? `<p class="empty">This reel has expired. Newer games have taken its place.</p>`
      : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Snap & Solve · Highlights</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #221b16;
        color: #faf4ec;
      }
      header {
        padding: 32px 20px 8px;
        text-align: center;
      }
      header h1 { margin: 0 0 4px; font-size: 24px; }
      header p  { margin: 0; opacity: 0.7; font-size: 14px; }
      main {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
        padding: 24px 16px 64px;
        max-width: 720px;
        margin: 0 auto;
      }
      @media (min-width: 640px) {
        main { grid-template-columns: 1fr 1fr; }
      }
      .card {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        padding: 14px;
        text-align: center;
      }
      .card img {
        width: 100%; height: auto; border-radius: 8px; background: #000;
      }
      .caption { margin: 10px 0 8px; font-weight: 600; }
      .dl {
        display: inline-block;
        padding: 8px 14px;
        border-radius: 8px;
        background: #f0aa5f;
        color: #221b16;
        text-decoration: none;
        font-weight: 700;
      }
      .empty { text-align: center; opacity: 0.7; }
      footer {
        text-align: center;
        opacity: 0.55;
        font-size: 12px;
        padding: 24px 12px 32px;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>${escapeHtml(game.p1_name)} vs ${escapeHtml(game.p2_name)}</h1>
      <p>${winnerLabel} · ${seconds}s</p>
    </header>
    <main>
      ${cards || emptyState}
    </main>
    <footer>Snap & Solve · SUTD AIIG · ${game.visits + 1} views</footer>
  </body>
</html>`;
}

function notFoundHtml(message: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Snap & Solve</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>body{font-family:system-ui;background:#221b16;color:#faf4ec;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}</style>
    </head><body><div><h1>${escapeHtml(message)}</h1><p>Snap & Solve · SUTD AIIG</p></div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
