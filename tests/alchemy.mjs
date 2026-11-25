import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CARDS, ECONOMY, PACKS, RARITIES } from '../docs/catalog.js'
import { ALCHEMY, ANIMATION_MODES } from '../docs/game-config.js'
import {
  acknowledgeReveal, createEssence, createGame, fuseCards, getCard, getExpeditionSlots,
  loadGame, previewEssence, previewExpedition, previewFusion, runExpedition,
  SAVE_VERSION, serializeGame, setAnimationMode, useEssence,
} from '../docs/engine.js'

const sureSuccess = () => 0
const sureFailure = () => 0.999999
const pairKey = (a, b) => [a, b].sort().join('|')
const nobodyRolls = () => assert.fail('Una operación rechazada no debe tirar el dado')
const ownedCount = (state, id) => state.inventory[id] ?? 0

function stocked() {
  return {
    ...createGame(),
    coins: 1_000_000,
    inventory: Object.fromEntries(CARDS.map(card => [card.id, 20])),
  }
}

function finish(result) {
  assert.ok(result.ok, result.error)
  const ended = acknowledgeReveal(result.state, result.reveal.id)
  assert.ok(ended.ok, ended.error)
  assert.equal(ended.state.pendingReveal, null)
  return ended.state
}

function randomFrom(seed) {
  let number = seed >>> 0
  return () => {
    number = (Math.imul(number, 1_664_525) + 1_013_904_223) >>> 0
    return number / 4_294_967_296
  }
}

function verifyQuoteAndRolls() {
  const origin = createGame()
  const quote = previewFusion(origin, 'alquimista', 'lobo')
  assert.deepEqual(Object.keys(quote).sort(),
    ['aberrationRate', 'affordable', 'cost', 'ok', 'successRate'].sort(),
    'La cotización no debe exponer la carta, ilustración, rareza, rasgos o variante')
  assert.ok(quote.ok && quote.affordable)
  assert.equal(quote.cost, ECONOMY.fusionCosts[1])
  assert.equal(quote.successRate, ALCHEMY.successRate)
  assert.ok(Math.abs(quote.aberrationRate + quote.successRate - 1) < 1e-12)
  assert.equal(quote.aberrationRate.toFixed(2), '0.05')

  const snapshot = serializeGame(origin)
  const rolled = [
    [0, 'success'],
    [ALCHEMY.successRate - Number.EPSILON, 'success'],
    [ALCHEMY.successRate, 'aberration'],
    [sureFailure(), 'aberration'],
  ]
  for (const [roll, expected] of rolled) {
    let calls = 0
    const resolved = fuseCards(origin, 'alquimista', 'lobo', () => {
      calls += 1
      return roll
    })
    assert.ok(resolved.ok)
    assert.equal(resolved.outcome, expected)
    assert.equal(calls, 1)
    assert.equal(resolved.state.coins, origin.coins - quote.cost)
    assert.equal(ownedCount(resolved.state, 'alquimista'), 0)
    assert.equal(ownedCount(resolved.state, 'lobo'), 0)
    assert.equal(ownedCount(resolved.state, resolved.card.id), 1)
    assert.deepEqual(resolved.state.pendingReveal, resolved.reveal)
    assert.equal(resolved.reveal.outcome, expected)
    assert.equal(resolved.reveal.cardId, resolved.card.id)

    const restored = loadGame(serializeGame(resolved.state))
    assert.deepEqual(restored.pendingReveal, resolved.reveal)
    assert.deepEqual(restored.inventory, resolved.state.inventory)
    assert.equal(restored.coins, resolved.state.coins)
    assert.equal(fuseCards(restored, 'mamut', 'buho', nobodyRolls).ok, false)
    assert.equal(acknowledgeReveal(restored, 'distinta').ok, false)
    const continued = finish({ ...resolved, state: restored })
    assert.equal(continued.coins, restored.coins)
    assert.deepEqual(continued.inventory, restored.inventory)
    assert.equal(fuseCards(continued, 'alquimista', 'lobo', nobodyRolls).ok, false)
    assert.equal(acknowledgeReveal(continued, resolved.reveal.id).ok, false)
  }

  assert.equal(serializeGame(origin), snapshot)
  const first = fuseCards(stocked(), 'alquimista', 'lobo', sureSuccess)
  const preexisting = finish(first)
  const repeated = previewFusion(preexisting, 'alquimista', 'lobo')
  assert.deepEqual(repeated, quote, 'Ni siquiera una fusión repetida debe revelar atributos o variantes al cotizar')
  const laterFailure = fuseCards(preexisting, 'alquimista', 'lobo', sureFailure)
  assert.equal(laterFailure.state.portraits[first.card.id], 1, 'La aberración no mejora el retrato de otra carta')
  assert.equal(ownedCount(laterFailure.state, first.card.id), 1)
  assert.equal(fuseCards({ ...origin, coins: quote.cost - 1 }, 'alquimista', 'lobo', nobodyRolls).ok, false)
  return rolled.length
}

function verifyAberrationRecovery() {
  const initial = createGame()
  const cost = ECONOMY.fusionCosts[0]
  const state = { ...initial, coins: cost, inventory: { lobo: 2 } }
  const result = fuseCards(state, 'lobo', 'lobo', sureFailure)
  assert.ok(result.ok)
  assert.equal(result.outcome, 'aberration')
  const { card } = result
  assert.equal(card.category, 'aberration')
  assert.ok(card.id && card.name && card.description)
  assert.deepEqual(card.parents, ['lobo', 'lobo'], 'La aberración conserva dos copias como progenitores exactos')
  assert.deepEqual(card.lineage, ['lobo'])
  assert.ok(!card.ability, 'Una aberración no aporta habilidades funcionales')
  assert.notEqual(card.id, fuseCards(state, 'lobo', 'lobo', sureSuccess).card.id)
  let next = finish(result)
  assert.equal(next.coins, 0)
  assert.equal(ownedCount(next, 'lobo'), 0)
  assert.equal(ownedCount(next, card.id), 1)
  assert.ok(next.discovered.includes(card.id))
  assert.ok(next.alchemyHistory.length > 0, 'Las fusiones fallidas quedan en el historial alquímico')
  assert.equal(previewFusion(next, card.id, card.id).ok, false)
  assert.equal(fuseCards(next, card.id, card.id, nobodyRolls).ok, false)
  assert.equal(previewExpedition(next, 'senda', [card.id]).ok, false)
  assert.equal(runExpedition(next, 'senda', [card.id]).ok, false)

  next = loadGame(serializeGame(next))
  assert.deepEqual(getCard(card.id, next), card)
  assert.equal(ownedCount(next, 'lobo'), 0, 'Cargar una derrota válida no repone materiales')
  assert.equal(getExpeditionSlots(next, 'senda'), 0)
  const cheapest = Math.min(...PACKS.map(pack => pack.cost))
  let trips = 0
  while (next.coins < cheapest) {
    const trip = runExpedition(next, 'senda', [])
    assert.ok(trip.ok && trip.result.success)
    assert.ok(trip.state.coins > next.coins)
    next = trip.state
    trips += 1
    assert.ok(trips <= 10, 'La derrota con los últimos materiales no puede bloquear el progreso')
  }
  return trips
}

function validatePairKeys(state, progenitors) {
  const valid = new Set()
  for (const [index, first] of progenitors.entries()) {
    for (const second of progenitors.slice(index)) {
      if (first.id === second.id && first.count < 2) continue
      const a = getCard(first.id, state)
      const b = getCard(second.id, state)
      assert.ok(a && b)
      if (Math.max(a.generation, b.generation) >= ALCHEMY.maxGeneration) continue
      if (Math.max(a.generation, b.generation) > 0 && a.lineage.some(id => b.lineage.includes(id))) continue
      valid.add(pairKey(a.id, b.id))
    }
  }
  return valid
}

function verifyEssence() {
  const existing = fuseCards(stocked(), 'mago', 'buho', sureSuccess)
  let state = finish(existing)
  const parents = [
    ['alquimista', 'zorro'], ['lobo', 'civil'], ['zorro', 'alquimista'],
    ['mago', 'obrero'], [existing.card.id, 'lobo'],
  ]
  assert.equal(parents.length, ALCHEMY.aberrationsPerEssence)
  const choices = []
  for (const pair of parents) {
    const result = fuseCards(state, ...pair, sureFailure)
    assert.ok(result.ok)
    assert.equal(result.outcome, 'aberration')
    const exactParents = [...pair].sort()
    const lineage = [...new Set(exactParents.flatMap(id => getCard(id, state).lineage))].sort()
    assert.deepEqual(result.card.parents, exactParents)
    assert.deepEqual(result.card.lineage, lineage)
    choices.push(result.card.id)
    state = finish(result)
  }

  assert.equal(choices[0], choices[2], 'Repetir una fórmula fallida acumula copias de su aberración')
  assert.equal(ownedCount(state, choices[0]), 2)
  const before = serializeGame(state)
  const short = createEssence(state, choices.slice(1))
  assert.equal(short.ok, false, 'El costo en aberraciones debe ser exacto')
  assert.equal(createEssence(state, [...choices, choices[0]]).ok, false)
  assert.equal(createEssence(state, Array(choices.length).fill(choices[0])).ok, false, 'No permite sacrificar más copias que las que existen')
  assert.equal(createEssence(state, ['mamut', ...choices.slice(1)]).ok, false, 'No permite sacrificar cartas funcionales')
  assert.equal(serializeGame(state), before)

  const preview = previewEssence(state, choices)
  assert.ok(preview.ok)
  for (const secret of ['card', 'result', 'results', 'pairs', 'rarity', 'stats', 'art']) {
    assert.ok(!Object.hasOwn(preview, secret), `Crear esencia expone ${secret}`)
  }
  const created = createEssence(state, choices)
  assert.ok(created.ok, created.error)
  const { essence } = created
  assert.ok(essence.id)
  assert.equal(essence.category, 'essence')
  assert.equal(created.state.coins, state.coins)
  assert.deepEqual([...essence.sources].sort(), [...choices].sort())
  const recoveredCounts = {}
  for (const id of parents.flat()) recoveredCounts[id] = (recoveredCounts[id] ?? 0) + 1
  assert.deepEqual(Object.fromEntries(essence.progenitors.map(parent => [parent.id, parent.count])), recoveredCounts,
    'La esencia debe recuperar los progenitores directos y sus copias, incluidas quimeras')
  const inventoryBeforeEssence = Object.fromEntries(Object.entries(state.inventory).filter(([id]) => !choices.includes(id)))
  assert.deepEqual(created.state.inventory, inventoryBeforeEssence, 'Solo se consumen las aberraciones seleccionadas')
  assert.equal(createEssence(created.state, choices).ok, false, 'No se pueden reciclar aberraciones ya sacrificadas')
  const restored = loadGame(serializeGame(created.state))
  assert.deepEqual(restored.essences[essence.id], essence)
  assert.ok(choices.every(id => restored.discovered.includes(id)), 'Las aberraciones sacrificadas siguen en descubrimientos')

  const pairs = validatePairKeys(restored, essence.progenitors)
  assert.equal(essence.pairCount, pairs.size)
  assert.ok(pairs.has(pairKey('alquimista', 'lobo')), 'Permite recombinar dos aberraciones distintas')
  assert.ok(pairs.has(pairKey('lobo', 'lobo')), 'Permite autofusión si se recuperaron dos copias')
  assert.ok(!pairs.has(pairKey('civil', 'civil')), 'No puede copiar un progenitor recuperado una sola vez')
  assert.ok(!pairs.has(pairKey('mago', existing.card.id)), 'Persiste la regla de linajes solapados')
  const observed = new Set()
  for (let index = 0; index < pairs.size; index += 1) {
    const recovered = useEssence(restored, essence.id, () => (index + 0.5) / pairs.size)
    assert.ok(recovered.ok, recovered.error)
    assert.equal(recovered.outcome, 'success')
    assert.equal(recovered.reveal.kind, 'essence')
    assert.equal(recovered.card.category, 'fusion')
    assert.equal(recovered.state.coins, restored.coins)
    assert.equal(recovered.state.essences[essence.id], undefined)
    const remainder = { ...recovered.state.inventory }
    if (remainder[recovered.card.id] === 1) delete remainder[recovered.card.id]
    else remainder[recovered.card.id] -= 1
    assert.deepEqual(remainder, restored.inventory, 'Recuperar no consume ni devuelve cartas progenitoras')
    const key = pairKey(...recovered.card.parents)
    assert.ok(pairs.has(key), key)
    observed.add(key)
    const [a, b] = recovered.card.parents.map(id => getCard(id, restored))
    assert.equal(recovered.card.generation, Math.max(a.generation, b.generation) + 1)
    assert.ok(recovered.card.rarity <= Math.max(a.rarity, b.rarity) + 1)
    assert.equal(Object.values(recovered.card.stats).reduce((sum, value) => sum + value, 0), RARITIES[recovered.card.rarity].budget)
    if (key === pairKey('alquimista', 'lobo')) assert.equal(recovered.card.name, 'Arcanolobo')
  }
  assert.deepEqual(observed, pairs, 'Todos y solo los pares válidos deben corresponder a un tramo equiprobable')
  const onlyAberrations = Object.fromEntries(choices.map(id => [id, ownedCount(state, id)]))
  const fromEmpty = createEssence({ ...state, coins: 0, inventory: onlyAberrations }, choices)
  assert.ok(fromEmpty.ok)
  assert.deepEqual(fromEmpty.state.inventory, {})
  const emptySave = loadGame(serializeGame(fromEmpty.state))
  assert.deepEqual(emptySave.inventory, {}, 'Recargar tras un sacrificio total no repone las cartas iniciales')
  assert.deepEqual(emptySave.essences[fromEmpty.essence.id], fromEmpty.essence)
  const result = useEssence(emptySave, fromEmpty.essence.id, sureFailure)
  assert.ok(result.ok)
  assert.equal(result.outcome, 'success', 'Incluso una tirada en el rango de fallo siempre funciona con esencia')
  assert.equal(result.state.coins, 0)
  assert.deepEqual(result.state.inventory, { [result.card.id]: 1 })
  const pending = loadGame(serializeGame(result.state))
  assert.deepEqual(pending.pendingReveal, result.reveal)
  assert.equal(pending.essences[essence.id], undefined)
  assert.deepEqual(pending.alchemyHistory, result.state.alchemyHistory)
  assert.equal(useEssence(pending, essence.id, nobodyRolls).ok, false)
  const acknowledged = finish({ ...result, state: pending })
  assert.equal(useEssence(acknowledged, essence.id, nobodyRolls).ok, false)
  assert.ok(acknowledged.alchemyHistory.length > restored.alchemyHistory.length)
  return observed.size
}

function verifyGenerations() {
  let state = stocked()
  let material = CARDS[0]
  for (let generation = 1; generation <= ALCHEMY.maxGeneration; generation += 1) {
    const founder = CARDS[generation]
    const outcome = fuseCards(state, material.id, founder.id, sureSuccess)
    assert.ok(outcome.ok, outcome.error)
    assert.equal(outcome.card.generation, generation)
    assert.equal(outcome.card.lineage.length, generation + 1)
    assert.ok(outcome.card.name && outcome.card.description)
    assert.equal(outcome.card.category, 'fusion')
    const loaded = loadGame(serializeGame(outcome.state))
    assert.deepEqual(getCard(outcome.card.id, loaded), outcome.card)
    state = finish({ ...outcome, state: loaded })
    material = outcome.card
  }
  const rejected = fuseCards(state, material.id, CARDS[ALCHEMY.maxGeneration + 1].id, nobodyRolls)
  assert.equal(rejected.ok, false)
  return material.generation
}

function verifyMigratedPortraitSave() {
  const url = new URL('./fixtures/quimeraria-v1-portraits.json', import.meta.url)
  const original = JSON.parse(readFileSync(url, 'utf8'))
  let upgraded = loadGame(original)
  assert.equal(upgraded.version, SAVE_VERSION)
  for (const field of ['coins', 'inventory', 'pity', 'discovered', 'portraits']) {
    assert.deepEqual(upgraded[field], original[field], field)
  }
  for (const [name, value] of Object.entries(original.stats)) assert.deepEqual(upgraded.stats[name], value, name)
  for (const [id, card] of Object.entries(original.fusions)) assert.deepEqual(getCard(id, upgraded), card)
  assert.equal(upgraded.pendingReveal, null)
  assert.deepEqual(upgraded.essences, {})
  assert.deepEqual(upgraded.aberrations, {})
  assert.equal(upgraded.settings.animation, 'full')
  for (const mode of ANIMATION_MODES) {
    const changed = setAnimationMode(upgraded, mode)
    assert.ok(changed.ok)
    upgraded = loadGame(serializeGame(changed.state))
    assert.equal(upgraded.settings.animation, mode)
    assert.deepEqual(upgraded.inventory, original.inventory)
  }
  assert.equal(setAnimationMode(upgraded, 'invalid').ok, false)
  const custom = loadGame({ ...original, settings: { animation: 'reduced', preferenciaAdicional: true } })
  assert.deepEqual(custom.settings, { animation: 'reduced', preferenciaAdicional: true })
  return Object.keys(original.fusions).length
}

function simulateFailureEconomy() {
  const count = 24_000
  const a = 'alquimista'
  const b = 'lobo'
  const initial = { ...createGame(), coins: count * ECONOMY.fusionCosts[1], inventory: { [a]: count, [b]: count } }
  const rng = randomFrom(823_095)
  const attemptCost = previewFusion(initial, a, b).cost
  let state = initial
  let successes = 0
  let failures = 0
  let recovered = 0
  let aberrationId

  for (let attempt = 0; attempt < count; attempt += 1) {
    const resolved = fuseCards(state, a, b, rng)
    assert.ok(resolved.ok, resolved.error)
    successes += Number(resolved.outcome === 'success')
    failures += Number(resolved.outcome === 'aberration')
    if (resolved.outcome === 'aberration') aberrationId = resolved.card.id
    state = finish(resolved)
    if (aberrationId && ownedCount(state, aberrationId) >= ALCHEMY.aberrationsPerEssence) {
      const created = createEssence(state, Array(ALCHEMY.aberrationsPerEssence).fill(aberrationId))
      assert.ok(created.ok, created.error)
      const returned = useEssence(created.state, created.essence.id, rng)
      assert.ok(returned.ok && returned.outcome === 'success')
      state = finish(returned)
      recovered += 1
    }
  }
  const probability = 1 - ALCHEMY.successRate
  const mean = count * probability
  const standardDeviation = Math.sqrt(count * probability * (1 - probability))
  assert.ok(Math.abs(failures - mean) < 5 * standardDeviation, `Frecuencia de fallo inesperada: ${failures}/${count}`)
  assert.equal(state.coins, initial.coins - count * attemptCost)
  assert.equal(ownedCount(state, a), 0)
  assert.equal(ownedCount(state, b), 0)
  assert.equal(ownedCount(state, aberrationId), failures % ALCHEMY.aberrationsPerEssence)
  assert.equal(recovered, Math.floor(failures / ALCHEMY.aberrationsPerEssence))
  assert.equal(Object.keys(state.essences).length, 0)
  const functionalCopies = Object.entries(state.inventory).reduce((sum, [id, copies]) =>
    sum + (getCard(id, state).category === 'fusion' ? copies : 0), 0)
  assert.equal(functionalCopies, successes + recovered, 'Los materiales y resultados deben conciliar sin duplicaciones')
  assert.equal(state.stats.fusions, functionalCopies)
  assert.equal(state.stats.fusionFailures, failures)
  assert.equal(state.stats.essencesCreated, recovered)
  assert.equal(state.stats.essencesUsed, recovered)
  assert.equal(state.alchemyHistory.length, ALCHEMY.historyLimit)
  assert.ok(functionalCopies < count, 'Esencia recupera solo parte del valor de los intentos fallidos')
  return {
    intentos: count,
    exitos: successes,
    fallos: failures,
    tasaDeFallo: Number((failures * 100 / count).toFixed(2)),
    esenciasConsumidas: recovered,
    cartasJugables: functionalCopies,
    obolosConsumidos: initial.coins - state.coins,
  }
}

console.log(JSON.stringify({
  tiradasEnElLimite: verifyQuoteAndRolls(),
  expedicionesDeRecuperacion: verifyAberrationRecovery(),
  paresValidosDeEsencia: verifyEssence(),
  generacionMaxima: verifyGenerations(),
  cartasConRetratoMigrado: verifyMigratedPortraitSave(),
  simulacion: simulateFailureEconomy(),
}, null, 2))
