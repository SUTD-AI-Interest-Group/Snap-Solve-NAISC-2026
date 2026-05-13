import { supabase } from './supabaseClient';
import type { GameMeta } from '$lib/game/state';
import type { HighlightWindow } from './selector';

export interface UploadedGame {
  gameId: string;
  landingUrl: string;
}

export async function uploadGame(
  meta: GameMeta,
  highlights: Array<{ window: HighlightWindow; gif: Blob }>,
  functionUrl: string
): Promise<UploadedGame | null> {
  const sb = supabase();

  // 1. Create the game row.
  const { data: game, error: gameErr } = await sb
    .from('games')
    .insert({
      p1_name: meta.p1Name.slice(0, 32),
      p2_name: meta.p2Name.slice(0, 32),
      winner: meta.winner,
      duration_ms: meta.durationMs
    })
    .select()
    .single();
  if (gameErr || !game) {
    console.error('uploadGame: games insert failed', gameErr);
    return null;
  }
  const gameId: string = game.id;

  // 2. Upload each GIF + insert highlight row.
  let successCount = 0;
  for (const h of highlights) {
    const path = `${gameId}/${h.window.kind}.gif`;
    const { error: upErr } = await sb.storage.from('highlights').upload(path, h.gif, {
      contentType: 'image/gif',
      upsert: true
    });
    if (upErr) {
      console.warn(`uploadGame: storage upload failed for ${path}`, upErr);
      continue;
    }
    const { error: rowErr } = await sb.from('highlights').insert({
      game_id: gameId,
      kind: h.window.kind,
      player: h.window.player,
      storage_path: path,
      caption: h.window.caption
    });
    if (rowErr) {
      console.warn(`uploadGame: highlights row insert failed for ${path}`, rowErr);
      continue;
    }
    successCount += 1;
  }

  // 3. If nothing made it, undo the orphan games row + return null.
  if (successCount === 0) {
    await sb.from('games').delete().eq('id', gameId);
    return null;
  }

  return {
    gameId,
    landingUrl: `${functionUrl}/${gameId}`
  };
}
