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

  // 1. Create the game row via SECURITY DEFINER RPC. We don't grant anon
  // SELECT on `games` (to prevent enumeration), so a direct
  // `.insert().select().single()` would fail to return the new id. The RPC
  // does the insert + returns the id with the definer's privileges.
  const { data: gameId, error: gameErr } = await sb.rpc('create_game', {
    p1: meta.p1Name.slice(0, 32),
    p2: meta.p2Name.slice(0, 32),
    w: meta.winner,
    dur: meta.durationMs
  });
  if (gameErr || !gameId || typeof gameId !== 'string') {
    console.error('uploadGame: create_game RPC failed', gameErr);
    return null;
  }

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
      // Storage upload already succeeded — clean up the orphan object so
      // the bucket doesn't accumulate untracked files. The cap trigger only
      // deletes objects for rows it deletes; it can't see rows that were
      // never inserted.
      const { error: rmErr } = await sb.storage.from('highlights').remove([path]);
      if (rmErr) console.warn(`uploadGame: orphan storage cleanup failed for ${path}`, rmErr);
      continue;
    }
    successCount += 1;
  }

  // 3. If nothing made it, undo the orphan games row + return null. The
  // delete_empty_game RPC is safer than a direct delete (it only removes
  // rows with no highlights — guarding against a race where someone else
  // attached highlights to this game id between insert and rollback).
  if (successCount === 0) {
    const { error: delErr } = await sb.rpc('delete_empty_game', { game_id: gameId });
    if (delErr) console.warn(`uploadGame: orphan game rollback failed`, delErr);
    return null;
  }

  return {
    gameId,
    landingUrl: `${functionUrl}/${gameId}`
  };
}
