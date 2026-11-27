function legacyRange(game,cardId) {
  const quantity = game.inventory[cardId] ?? 0;
  const tracked = (game.fusionCopies?.[cardId]?.length ?? 0)+(game.baseCopies?.[cardId]?.length ?? 0);
  const count = Math.max(0,quantity-tracked);
  const { head=0,removed=[] } = game.legacyCopies?.[cardId] ?? {};
  return { head,removed,end:head+count+removed.length };
}

function* trackedCopies(game,cardId) {
  let remaining = game.inventory[cardId] ?? 0;
  for (const list of [game.fusionCopies?.[cardId],game.baseCopies?.[cardId]]) {
    for (const copy of list ?? []) {
      if (remaining--<=0) return;
      yield copy;
    }
  }
}

function* legacyCopies(game,cardId) {
  const {head,removed,end} = legacyRange(game,cardId);
  const skipped = new Set(removed);
  for (let i=head;i<end;i++) if (!skipped.has(i)) yield { id:`legacy:${cardId}:${i}` };
}

function legacyIndex(cardId,copyId) {
  const prefix = `legacy:${cardId}:`;
  if (!copyId.startsWith(prefix)) return null;
  const index = Number(copyId.slice(prefix.length));
  return Number.isSafeInteger(index) && copyId===prefix+index ? index : null;
}

export function creatureCopies(game,cardId) {
  return [...trackedCopies(game,cardId),...legacyCopies(game,cardId)];
}

export function activeCopies(game) {
  return new Set((game.arena?.active?.player ?? []).filter(Boolean).map(copy=>copy.copyId));
}

export function chooseMaterials(game,cards,copyIds) {
  const wanted = Array.isArray(copyIds) ? copyIds : [];
  const requested = new Set(wanted.filter(id=>typeof id==="string"));
  const occupied = activeCopies(game);
  const chosen = new Set();
  const materials = [];
  for (const [slot,cardId] of cards.entries()) {
    const exact = wanted[slot];
    let id;
    if (exact) {
      if (typeof exact!=="string" || occupied.has(exact) || chosen.has(exact)) return null;
      const index = legacyIndex(cardId,exact);
      if (index===null) {
        for (const copy of trackedCopies(game,cardId)) if (copy.id===exact) { id=copy.id; break; }
      } else {
        const {head,removed,end} = legacyRange(game,cardId);
        if (index>=head && index<end && !removed.includes(index)) id=exact;
      }
    } else {
      // El consumo automático empieza por las copias históricas.
      for (const copies of [legacyCopies(game,cardId),trackedCopies(game,cardId)]) {
        for (const copy of copies) if (!chosen.has(copy.id) && !occupied.has(copy.id) && !requested.has(copy.id)) {
          id=copy.id;
          break;
        }
        if (id) break;
      }
    }
    if (!id) return null;
    chosen.add(id);
    materials.push({ cardId,copyId:id });
  }
  return materials;
}

export function removeInstances(game,materials) {
  if (!materials.length) return {};
  const ids = new Set(materials.map(item=>item.copyId));
  const ranges = { ...game.legacyCopies };
  const fusionCopies = { ...game.fusionCopies };
  const baseCopies = { ...game.baseCopies };
  for (const cardId of new Set(materials.map(item=>item.cardId))) {
    const selected = materials.filter(item=>item.cardId===cardId);
    const removed = selected.map(item=>legacyIndex(cardId,item.copyId)).filter(index=>index!==null);
    if (removed.length) {
      const range = legacyRange(game,cardId);
      let head = range.head;
      const skipped = new Set([...range.removed,...removed]);
      // El consumo consecutivo solo mueve el inicio. Las bajas aisladas ocupan un índice.
      while (skipped.delete(head)) head++;
      ranges[cardId] = { head,removed:[...skipped] };
    }
    if (removed.length===selected.length) continue;
    for (const list of [fusionCopies,baseCopies]) {
      if (!list[cardId]) continue;
      const remaining = list[cardId].filter(copy=>!ids.has(copy.id));
      if (remaining.length) list[cardId] = remaining;
      else delete list[cardId];
    }
  }
  const clinicalChange = [...ids].some(id=>game.health?.[id] || Object.values(game.specialists ?? {}).some(list=>list.includes(id)));
  const next = { fusionCopies,...(game.baseCopies && {baseCopies}),...(Object.keys(ranges).length && {legacyCopies:ranges}) };
  if (!clinicalChange) return next;
  return { ...next,
    health:Object.fromEntries(Object.entries(game.health ?? {}).filter(([id])=>!ids.has(id))),
    specialists:Object.fromEntries(Object.entries(game.specialists ?? {}).map(([area,list])=>[area,list.filter(id=>!ids.has(id))])),
    healthRevision:(game.healthRevision ?? 0)+1 };
}

export function restoreLegacyCopies(raw,game) {
  if (!raw || typeof raw!=="object" || Array.isArray(raw)) return {};
  const ranges = Object.fromEntries(Object.entries(raw).flatMap(([cardId,record])=>{
    const head = record?.head;
    if (!Number.isSafeInteger(head) || head<0 || !Array.isArray(record.removed)) return [];
    const removed = [...new Set(record.removed.filter(i=>Number.isSafeInteger(i) && i>head))].sort((a,b)=>a-b);
    const end = head+legacyRange(game,cardId).end;
    // Conserva solo huecos que caen dentro de la cantidad de ejemplares que sigue en la pila.
    const valid = removed.filter((index,i)=>index<=end+i);
    return [[cardId,{head,removed:valid}]];
  }));
  return { legacyCopies:ranges };
}
