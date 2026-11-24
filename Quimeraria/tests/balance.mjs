import assert from 'node:assert/strict'
import {
  ABILITIES, CARDS, CATEGORIES, MISSIONS, PACKS, RARITIES, RECIPES, STARTER, STATS, TRAITS,
} from '../dist/catalog.js'
import {
  createGame, fuseCards, getCard, getPackOdds, loadGame, openPack,
  previewExpedition, previewFusion, runExpedition, serializeGame,
} from '../dist/engine.js'

const byRarity = () => Array(RARITIES.length).fill(0)
const budget = card => Object.values(card.stats).reduce((total, value) => total + value, 0)
const pairKey = (first, second) => [first, second].sort().join('|')
const starterRoute = MISSIONS.find(mission => mission.slots === 1 && mission.threshold <= 1)
const quantum = 0.000001

function richGame(inventory) {
  return { ...createGame(), coins: 1_000_000, inventory }
}

function randomFrom(seed) {
  let number = seed >>> 0
  return () => {
    number = (Math.imul(number, 1_664_525) + 1_013_904_223) >>> 0
    return number / 4_294_967_296
  }
}

function verifyCatalog() {
  const ids = new Set(CARDS.map(card => card.id))
  assert.equal(ids.size, CARDS.length, 'Los identificadores de cartas deben ser únicos')
  assert.ok(CARDS.length >= 12, 'El catálogo inicial necesita variedad')
  assert.ok(new Set(CARDS.map(card => card.category)).size >= 5, 'El catálogo debe cubrir las cinco familias anunciadas')
  assert.ok(Object.keys(STARTER).every(id => ids.has(id)), 'El grupo inicial solo admite cartas del catálogo')
  for (const [id, ability] of Object.entries(ABILITIES)) {
    assert.ok(STATS[ability.stat], `Atributo de habilidad inválido: ${id}`)
    assert.ok(Number.isInteger(ability.bonus) && ability.bonus > 0 && ability.bonus <= 3, `Bono de habilidad inválido: ${id}`)
  }
  const pairs = new Set()
  for (const recipe of RECIPES) {
    assert.equal(recipe.parents.length, 2, recipe.name)
    assert.ok(recipe.parents.every(id => ids.has(id)), `Receta con progenitor desconocido: ${recipe.name}`)
    const key = pairKey(...recipe.parents)
    assert.ok(!pairs.has(key), `La receta ${recipe.name} duplica un par`)
    pairs.add(key)
    if (recipe.traits) assert.ok(recipe.traits.every(trait => TRAITS[trait]), recipe.name)
    if (recipe.specialization) {
      const { stat, weight } = recipe.specialization
      assert.ok(STATS[stat] && Number.isFinite(weight) && weight >= 0 && weight <= 6, recipe.name)
    }
  }
  for (const card of CARDS) {
    assert.match(card.id, /^[a-z0-9_-]+$/)
    assert.ok(CATEGORIES[card.category] && card.category !== 'fusion', card.name)
    assert.ok(RARITIES[card.rarity], `Rareza inválida: ${card.name}`)
    assert.ok(budget(card) <= RARITIES[card.rarity].budget, `Presupuesto excedido: ${card.name}`)
    assert.deepEqual(Object.keys(card.stats).sort(), Object.keys(STATS).sort(), card.name)
    assert.ok(Object.values(card.stats).every(value => Number.isInteger(value) && value > 0), card.name)
    assert.ok(card.traits.every(trait => TRAITS[trait]), `Rasgo desconocido: ${card.name}`)
    assert.ok(ABILITIES[card.ability], `Habilidad desconocida: ${card.name}`)
  }
  for (const pack of PACKS) {
    assert.equal(pack.weights.length, RARITIES.length, pack.name)
    for (const [rarity, weight] of pack.weights.entries()) {
      assert.ok(Number.isFinite(weight) && weight >= 0, pack.name)
      assert.ok(!weight || CARDS.some(card =>
        card.rarity === rarity && (!pack.categories || pack.categories.includes(card.category))),
      `El sobre ${pack.name} ofrece una rareza sin cartas`)
    }
  }
  assert.ok(starterRoute, 'Hace falta una expedición de recuperación de una carta')
}

function verifyFusions() {
  const inventory = Object.fromEntries(CARDS.map(card => [card.id, 2]))
  const recipes = new Map(RECIPES.map(recipe => [pairKey(...recipe.parents), recipe]))
  const state = richGame(inventory)
  const snapshot = serializeGame(state)
  let pairCount = 0
  let secondGenerationCount = 0
  const fusionsByRarity = byRarity()
  let recipeCount = 0

  for (const [index, first] of CARDS.entries()) {
    for (const second of CARDS.slice(index)) {
      const label = `${first.name} + ${second.name}`
      const preview = previewFusion(state, first.id, second.id)
      const reversed = previewFusion(state, second.id, first.id)
      assert.ok(preview.ok && reversed.ok, `La pareja debe poder fusionarse: ${label}`)
      assert.deepEqual(preview.card, reversed.card, `El orden cambió el resultado: ${label}`)
      assert.equal(preview.cost, reversed.cost, `El orden cambió el costo: ${label}`)
      assert.equal(preview.card.generation, 1, label)
      assert.equal(budget(preview.card), RARITIES[preview.card.rarity].budget, `Presupuesto incumplido: ${label}`)
      assert.ok(preview.card.rarity <= Math.max(first.rarity, second.rarity) + 1, `Salto de rareza inesperado: ${label}`)
      if (preview.card.rarity === 4) {
        assert.ok(Math.min(first.rarity, second.rarity) >= 3, `Una mítica exige dos progenitores de rareza épica: ${label}`)
      }
      assert.ok(preview.card.traits.every(trait => TRAITS[trait]), label)
      assert.ok(ABILITIES[preview.card.ability], label)

      const fusion = fuseCards(state, first.id, second.id)
      assert.ok(fusion.ok, label)
      assert.deepEqual(fusion.card, preview.card, `La previsualización cambió al confirmar: ${label}`)
      assert.equal(fusion.state.coins, state.coins - preview.cost, label)
      assert.equal(fusion.state.inventory[preview.card.id], 1, label)
      assert.equal(fusion.state.inventory[first.id] || 0, first.id === second.id ? 0 : 1, label)
      if (first.id !== second.id) {
        assert.equal(fusion.state.inventory[second.id], 1, label)
      }
      assert.ok(fusion.state.discovered.includes(preview.card.id), label)
      assert.deepEqual(getCard(preview.card.id, loadGame(serializeGame(fusion.state))), preview.card, `La quimera cambió al cargar: ${label}`)

      const fresh = CARDS.find(card => card.id !== first.id && card.id !== second.id)
      const secondPreview = previewFusion(fusion.state, preview.card.id, fresh.id)
      const secondReversed = previewFusion(fusion.state, fresh.id, preview.card.id)
      assert.ok(secondPreview.ok && secondReversed.ok, `Fusión de segunda generación rechazada: ${label}`)
      assert.deepEqual(secondPreview.card, secondReversed.card, label)
      assert.equal(secondPreview.card.generation, 2, label)
      assert.equal(budget(secondPreview.card), RARITIES[secondPreview.card.rarity].budget, label)
      const secondFusion = fuseCards(fusion.state, preview.card.id, fresh.id)
      assert.ok(secondFusion.ok, label)
      const reopened = loadGame(serializeGame(secondFusion.state))
      assert.deepEqual(getCard(secondPreview.card.id, reopened), secondPreview.card, label)
      assert.deepEqual(getCard(preview.card.id, reopened), preview.card, label)
      assert.ok(reopened.discovered.includes(preview.card.id) && reopened.discovered.includes(secondPreview.card.id), label)

      const fourthBase = CARDS.find(card => ![first.id, second.id, fresh.id].includes(card.id))
      const thirdPreview = previewFusion(secondFusion.state, secondPreview.card.id, fourthBase.id)
      assert.equal(thirdPreview.ok, false, `Se superó el límite de generaciones: ${label}`)
      const crossedLineage = previewFusion(fusion.state, preview.card.id, first.id)
      assert.equal(crossedLineage.ok, false, `Se permitió reincorporar un ancestro: ${label}`)

      const recipe = recipes.get(pairKey(first.id, second.id))
      if (recipe) {
        assert.equal(preview.card.name, recipe.name, label)
        if (recipe.rarity !== undefined) assert.equal(preview.card.rarity, recipe.rarity, label)
        if (recipe.ability) assert.equal(preview.card.ability, recipe.ability, label)
        recipeCount += 1
      }

      pairCount += 1
      secondGenerationCount += 1
      fusionsByRarity[preview.card.rarity] += 1
    }
  }

  const baseId = CARDS[0].id
  const singleCopy = richGame({ [baseId]: 1 })
  assert.equal(fuseCards(singleCopy, baseId, baseId).ok, false, 'Una sola copia no debe duplicarse al fusionar')
  assert.equal(fuseCards({ ...state, coins: 0 }, CARDS[0].id, CARDS[1].id).ok, false, 'La fusión requiere moneda')
  assert.equal(serializeGame(state), snapshot, 'Las acciones deben preservar el estado que reciben')
  assert.equal(recipeCount, RECIPES.length, 'Cada receta debe ser alcanzable')
  return { pares: pairCount, segundaGeneracion: secondGenerationCount, recetas: recipeCount, rarezas: fusionsByRarity }
}

function verifyPack(pack, seed) {
  const rolls = 4_000
  let state = richGame({})
  const random = randomFrom(seed)
  const normalSlotsByRarity = byRarity()
  let forced = 0
  let misses = 0
  let worstStreak = 0
  let nativeSlots = 0
  const normal = getPackOdds(state, pack.id)
  assert.ok(normal.ok)
  assert.ok(Math.abs(normal.odds.reduce((sum, weight) => sum + weight, 0) - 100) < quantum, pack.name)
  for (let roll = 0; roll < rolls; roll += 1) {
    const odds = getPackOdds(state, pack.id)
    const result = openPack(state, pack.id, random)
    assert.ok(result.ok, pack.name)
    assert.equal(result.cards.length, pack.slots, pack.name)
    const resolved = result.cards.map(card => typeof card === 'string' ? getCard(card, result.state) : card)
    for (const card of resolved) {
      assert.ok(CARDS.some(base => base.id === card.id), `El sobre contiene una quimera: ${pack.name}`)
      assert.ok(!pack.categories || pack.categories.includes(card.category), `Carta fuera de la temática del sobre: ${card.name}`)
      assert.ok(result.state.inventory[card.id] > (state.inventory[card.id] || 0), card.name)
    }
    if (odds.pityActive) forced += 1
    for (const [slot, card] of resolved.entries()) {
      if (!odds.pityActive || slot < resolved.length - 1) {
        normalSlotsByRarity[card.rarity] += 1
        nativeSlots += 1
      }
    }
    if (pack.pityAt) {
      const qualified = resolved.some(card => card.rarity >= pack.pityRarity)
      misses = qualified ? 0 : misses + 1
      worstStreak = Math.max(worstStreak, misses)
      assert.equal(odds.pityActive, Boolean(state.pity[pack.id] >= pack.pityAt - 1), pack.name)
      assert.equal(result.state.pity[pack.id] || 0, misses, pack.name)
      assert.ok(misses < pack.pityAt, `Racha por encima de la garantía: ${pack.name}`)
    }
    assert.equal(result.state.coins, state.coins - pack.cost, pack.name)
    state = result.state
  }
  const observed = normalSlotsByRarity.map(count => count / nativeSlots)
  for (const [rarity, count] of normalSlotsByRarity.entries()) {
    const expected = normal.odds[rarity] / 100
    if (!expected) {
      assert.equal(count, 0, `Rareza con peso cero obtenida: ${pack.name}`)
    } else {
      const std = Math.sqrt(nativeSlots * expected * (1 - expected))
      assert.ok(Math.abs(count - nativeSlots * expected) < 6 * std + 1, `Frecuencia fuera del margen: ${pack.name}, rareza ${rarity}`)
    }
  }
  assert.equal(openPack({ ...state, coins: pack.cost - 1 }, pack.id, random).ok, false, 'El sobre requiere su costo completo')
  return {
    sobre: pack.name,
    aperturas: rolls,
    sobresConGarantiaActiva: forced,
    peorRacha: worstStreak,
    frecuenciaNatural: observed.map(value => Number((value * 100).toFixed(1))),
  }
}

function verifyRecovery() {
  const cheapest = Math.min(...PACKS.map(pack => pack.cost))
  let maximumRuns = 0
  for (const card of CARDS) {
    let state = { ...createGame(), coins: 0, inventory: { [card.id]: 1 } }
    let runs = 0
    while (state.coins < cheapest) {
      const preview = previewExpedition(state, starterRoute.id, [card.id])
      assert.ok(preview.ok && preview.result.success, `La recuperación no funciona con ${card.name}`)
      const run = runExpedition(state, starterRoute.id, [card.id])
      assert.ok(run.ok && run.result.success, card.name)
      assert.deepEqual(run.result, preview.result, card.name)
      assert.ok(run.state.coins > state.coins, card.name)
      assert.equal(run.state.inventory[card.id], 1, 'Las expediciones no deben consumir cartas')
      state = run.state
      runs += 1
      assert.ok(runs < 20, 'La recuperación tarda demasiadas expediciones')
    }
    maximumRuns = Math.max(maximumRuns, runs)
  }
  return maximumRuns
}

function rankForMission(card, mission) {
  if (!mission.stat) return 1
  const ability = ABILITIES[card.ability]
  return card.stats[mission.stat]
    + (ability.stat === mission.stat ? ability.bonus : 0)
    + (card.traits.includes(mission.trait) ? mission.traitBonus || 0 : 0)
}

function squadCombinations(state, ids, slots) {
  function* visit(start, group) {
    if (group.length === slots) {
      yield group
      return
    }
    for (let index = start; index < ids.length; index += 1) {
      const id = ids[index]
      if (group.filter(cardId => cardId === id).length < state.inventory[id]) {
        yield* visit(index, [...group, id])
      }
    }
  }
  return visit(0, [])
}

function squads(state, mission) {
  const ids = Object.keys(state.inventory).filter(id => state.inventory[id] > 0)
  const ranked = ids.map(id => getCard(id, state))
    .sort((a, b) => rankForMission(b, mission) - rankForMission(a, mission))
    .slice(0, Math.max(mission.slots, 8))
    .map(card => card.id)
  return squadCombinations(state, ranked, mission.slots)
}

function bestExpedition(state) {
  let best = null
  for (const mission of MISSIONS) {
    for (const ids of squads(state, mission)) {
      const preview = previewExpedition(state, mission.id, ids)
      if (preview.ok && preview.result.success && (!best || preview.result.reward > best.reward)) {
        best = { mission, ids, reward: preview.result.reward }
        break
      }
    }
  }
  return best
}

function verifyStarterFusion() {
  const initial = createGame()
  const fused = fuseCards(initial, 'alquimista', 'lobo')
  assert.ok(fused.ok, 'Arcanolobo debe poder descubrirse con la colección inicial')
  const mission = MISSIONS.find(entry => entry.id === 'observatorio')
  const bestScore = state => Math.max(...[...squads(state, mission)].map(ids =>
    previewExpedition(state, mission.id, ids).result.score))
  const before = bestScore(initial)
  const after = bestScore(fused.state)
  assert.ok(after > before, 'Arcanolobo debe mejorar el mejor equipo en el Observatorio')
  return { carta: fused.card.name, ruta: mission.name, puntosAntes: before, puntosDespues: after }
}

function verifyExpeditionScoring() {
  const state = richGame(Object.fromEntries(CARDS.map(card => [card.id, 2])))
  let wins = 0
  let losses = 0
  let meaningfulAbilities = 0
  for (const mission of MISSIONS.filter(entry => entry.stat)) {
    for (const ids of squadCombinations(state, Object.keys(state.inventory), mission.slots)) {
      const preview = previewExpedition(state, mission.id, ids)
      assert.ok(preview.ok)
      const { result } = preview
      const totalStats = ids.reduce((sum, id) => sum + getCard(id, state).stats[mission.stat], 0)
      assert.ok(result.score >= totalStats, mission.name)
      assert.equal(result.success, result.score >= mission.threshold, mission.name)
      assert.equal(result.score, previewExpedition(state, mission.id, [...ids].reverse()).result.score, mission.name)
      assert.ok(result.reward >= 0, mission.name)
      if (result.success) wins += 1
      else losses += 1
      if (result.success && totalStats < mission.threshold) meaningfulAbilities += 1
    }
    const winner = [...squads(state, mission)].find(ids => previewExpedition(state, mission.id, ids).result?.success)
    assert.ok(winner, `La colección completa debe superar ${mission.name}`)
    const firstClear = runExpedition(state, mission.id, winner)
    const repeatedClear = runExpedition(firstClear.state, mission.id, winner)
    assert.ok(firstClear.ok && repeatedClear.ok)
    assert.equal(firstClear.result.reward, mission.reward + (mission.firstClear || 0), mission.name)
    assert.equal(repeatedClear.result.reward, mission.reward, mission.name)
    assert.equal(repeatedClear.state.coins, firstClear.state.coins + mission.reward, mission.name)
  }
  assert.ok(wins > 0 && losses > 0, 'Los umbrales deben distinguir equipos')
  assert.ok(meaningfulAbilities > 0, 'Las habilidades y rasgos deben influir en los resultados')
  const initial = createGame()
  const starterMissions = MISSIONS.filter(mission =>
    [...squads(initial, mission)].some(ids => previewExpedition(initial, mission.id, ids).result?.success))
  assert.ok(starterMissions.length > 1 && starterMissions.length < MISSIONS.length)
  return { exitos: wins, intentosFallidos: losses, exitosPorBonos: meaningfulAbilities, rutasIniciales: starterMissions.map(mission => mission.name) }
}

function pickFusion(state) {
  const ids = Object.keys(state.inventory)
    .filter(id => state.inventory[id] > 0)
    .sort((first, second) => budget(getCard(second, state)) - budget(getCard(first, state)))
    .slice(0, 10)
  const options = []
  for (const [index, first] of ids.entries()) {
    for (const second of ids.slice(index)) {
      const preview = previewFusion(state, first, second)
      if (preview.ok && preview.affordable && !state.discovered.includes(preview.card.id)) {
        const firstCard = getCard(first, state)
        const secondCard = getCard(second, state)
        const boost = Math.max(...Object.keys(preview.card.stats).map(stat => {
          const mission = { stat }
          return rankForMission(preview.card, mission) - Math.max(rankForMission(firstCard, mission), rankForMission(secondCard, mission))
        }))
        options.push({ first, second, score: 10 * boost + budget(preview.card), cost: preview.cost })
      }
    }
  }
  return options.sort((a, b) => b.score - a.score || a.cost - b.cost)[0]
}

function simulateProgression(pack) {
  const campaigns = 18
  const purchases = 5
  let totalRuns = 0
  let maximumRuns = 0
  let highestRouteReached = 0
  let totalDiscoveries = 0
  let totalFusions = 0
  const finalRoute = MISSIONS.reduce((hardest, mission) => mission.reward > hardest.reward ? mission : hardest)
  for (let seed = 1; seed <= campaigns; seed += 1) {
    const random = randomFrom(seed * 777)
    let state = createGame()
    let expeditions = 0
    for (let purchase = 0; purchase < purchases; purchase += 1) {
      if (purchase > 0) {
        const choice = pickFusion(state)
        if (choice) {
          const fused = fuseCards(state, choice.first, choice.second)
          assert.ok(fused.ok)
          state = fused.state
        }
      }
      while (state.coins < pack.cost) {
        const best = bestExpedition(state)
        assert.ok(best, `Partida ${seed}: sin vía para continuar`)
        const run = runExpedition(state, best.mission.id, best.ids)
        assert.ok(run.ok && run.result.success)
        assert.ok(run.state.coins > state.coins)
        state = run.state
        expeditions += 1
        assert.ok(expeditions < 90, `Partida ${seed}: economía lenta`)
      }
      const opened = openPack(state, pack.id, random)
      assert.ok(opened.ok)
      state = opened.state
    }
    highestRouteReached += Number([...squads(state, finalRoute)]
      .some(ids => previewExpedition(state, finalRoute.id, ids).result?.success))
    totalRuns += expeditions
    maximumRuns = Math.max(maximumRuns, expeditions)
    totalDiscoveries += state.discovered.length
    totalFusions += state.stats.fusions
  }
  return {
    sobre: pack.name,
    partidas: campaigns,
    sobresPorPartida: purchases,
    expedicionesPromedio: Number((totalRuns / campaigns).toFixed(1)),
    expedicionesMaximas: maximumRuns,
    partidasConRutaMasDificil: highestRouteReached,
    descubrimientosPromedio: Number((totalDiscoveries / campaigns).toFixed(1)),
    fusionesPromedio: Number((totalFusions / campaigns).toFixed(1)),
  }
}

verifyCatalog()
const summary = {
  cartasBase: CARDS.length,
  fusiones: verifyFusions(),
  fusionInicial: verifyStarterFusion(),
  expedicionesParaRecuperarse: verifyRecovery(),
  expediciones: verifyExpeditionScoring(),
  sobres: PACKS.map((pack, index) => verifyPack(pack, 1_117 + index * 17)),
  progresion: PACKS.map(pack => simulateProgression(pack)),
}
console.log(JSON.stringify(summary, null, 2))
