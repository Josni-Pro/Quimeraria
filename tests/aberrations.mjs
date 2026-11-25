import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { CARDS, RECIPES } from '../docs/catalog.js'
import { ALCHEMY } from '../docs/game-config.js'
import { ABERRATION_PILOT, ARCHIVED_ABERRATION_PAINTINGS, aberrationId } from '../docs/aberration-art-pilot.js'
import { ABERRATION_RULES_VERSION, FAILURE_AXES, FAILURE_FAMILIES } from '../docs/aberration-concepts.js'
import { assetPortrait, getPortrait } from '../docs/illustrations.js'
import {
  acknowledgeReveal, createEssence, createGame, fuseCards, getAberrationCopies, getCard,
  inspectAberrationVariants, inspectFusionVariants, loadGame, previewFusion, serializeGame, useEssence,
} from '../docs/engine.js'

const historicURL = new URL('./fixtures/quimeraria-v3-aberraciones.json', import.meta.url)
const forbiddenRoll = () => assert.fail('Una operación bloqueada debe conservar la tirada')
const sorted = pair => [...pair].sort()
const rng = initial => () => (initial = (Math.imul(initial, 1_664_525) + 1_013_904_223) >>> 0) / 2 ** 32

function stock() {
  return {
    ...createGame(), coins: 1_000_000,
    inventory: Object.fromEntries(CARDS.map(({ id }) => [id, 20])),
    discovered: CARDS.map(({ id }) => id)
  }
}

function close(result) {
  assert.ok(result.ok, result.error)
  const closed = acknowledgeReveal(result.state, result.reveal.id)
  assert.ok(closed.ok)
  return closed.state
}

function stages() {
  let state = stock()
  function make(first, second) {
    const result = fuseCards(state, first, second, () => 0)
    assert.equal(result.outcome, 'success', result.error)
    state = close(result)
    return result.card.id
  }
  const g1 = make('alquimista', 'mamut')
  make('mamut', 'alquimista')
  const other = make('buho', 'medica')
  const sea = make('fenix', 'sirena')
  const g2 = make(g1, 'obrero')
  const otherG2 = make(other, 'zorro')
  const g3 = make(g2, sea)
  const g4 = make(g3, otherG2)
  const inventory = { ...state.inventory, ...Object.fromEntries(Object.keys(state.fusions).map(id => [id, 10])) }
  return { state: { ...state, inventory }, g1, other, sea, g2, otherG2, g3, g4,
    pairs: [['alquimista', 'lobo'], [g1, 'obrero'], [g2, sea], [g3, otherG2]] }
}

function failWith(state, pair, key) {
  const { variants } = inspectAberrationVariants(state, ...pair)
  const target = key ? variants.findIndex(variant => variant.defect === key) : 0
  assert.ok(target >= 0)
  const draws = [0.97, (target + 0.5) / variants.length]
  const result = fuseCards(state, ...pair, () => draws.shift())
  assert.equal(result.outcome, 'aberration', result.error)
  assert.equal(result.card.id, variants[target].id)
  return result
}

test('El barrido de las 496 parejas devuelve fallos compatibles y estables', () => {
  const state = stock()
  const ids = new Set()
  const families = new Map()
  const distribution = new Map()
  for (const [index, first] of CARDS.entries()) {
    for (const second of CARDS.slice(index)) {
      const pair = [first.id, second.id]
      const { ok, variants } = inspectAberrationVariants(state, ...pair)
      assert.ok(ok && variants.length > 0)
      assert.deepEqual(inspectAberrationVariants(state, ...pair.toReversed()).variants, variants)
      assert.ok(Math.abs(variants.reduce((sum, card) => sum + card.probability, 0) - 1) < 1e-12)
      distribution.set(variants.length, (distribution.get(variants.length) ?? 0) + 1)
      for (const card of variants) {
        assert.ok(!ids.has(card.id))
        ids.add(card.id)
        families.set(card.family, (families.get(card.family) ?? 0) + 1)
        assert.equal(card.id, aberrationId(pair, card.defect))
        assert.equal(card.variantId, card.id)
        assert.equal(card.generation, 1)
        assert.deepEqual(card.parents, sorted(pair))
        assert.deepEqual(card.lineage, [...new Set(sorted(pair))])
        assert.equal(card.stats, null)
        assert.equal(card.ability, null)
        assert.ok(card.identity.anatomy && card.identity.scale.category && card.identity.visual && card.identity.attempt)
        assert.equal(card.failureRulesVersion, ABERRATION_RULES_VERSION)
        assert.ok(new Set(card.identity.impairments.map(block => block.axis)).size >= 2)
        for (const { axis, evidence } of card.identity.impairments) {
          assert.ok(FAILURE_AXES[axis])
          assert.ok(evidence.length > 40 && card.description.includes(evidence))
        }
        assert.deepEqual(card.identity.contributions.map(source => source.parentId), sorted(pair))
        assert.ok(card.identity.contributions.every(source => source.trait && source.contribution))
        assert.ok(FAILURE_FAMILIES[card.family])
      }
    }
  }
  assert.equal([...distribution.values()].reduce((sum, count) => sum + count, 0), 496)
  assert.equal(families.size, 8)
  assert.ok(distribution.size > 2)
  for (const recipe of RECIPES) assert.equal(previewFusion(state, ...recipe.parents).aberrationRate, 0.05)
  assert.equal(state.discovered.length, CARDS.length)
  console.log(JSON.stringify({ cobertura: 496, variantes: ids.size, porFamilia: Object.fromEntries(families),
    variantesPorPareja: Object.fromEntries([...distribution].sort(([a], [b]) => a - b)) }))
})

test('Los fallos de G1 a G4 se guardan antes de revelar y cada copia tiene su identidad', () => {
  const { state, pairs, g1, g4 } = stages()
  for (const [index, pair] of pairs.entries()) {
    const quote = previewFusion(state, ...pair)
    assert.equal(quote.generation, index + 1)
    assert.equal(quote.aberrationRate, 0.05)
    assert.equal(quote.successRate, 0.95)
    const result = failWith(state, pair)
    const loaded = loadGame(serializeGame(result.state))
    assert.equal(result.card.generation, index + 1)
    assert.equal(loaded.coins, state.coins - quote.cost)
    assert.equal(loaded.inventory[pair[0]], state.inventory[pair[0]] - 1)
    assert.equal(loaded.inventory[pair[1]], state.inventory[pair[1]] - 1)
    assert.deepEqual(loaded.pendingReveal, result.reveal)
    assert.deepEqual(loaded.aberrations[result.card.id], result.card)
    assert.deepEqual(getAberrationCopies(loaded, result.card.id), [{ id: result.instanceId }])
    assert.equal(fuseCards(loaded, ...pair, forbiddenRoll).ok, false)
    assert.equal(acknowledgeReveal(loaded, 'reveal-99999').ok, false)
    assert.equal(acknowledgeReveal(close({ ...result, state: loaded }), result.reveal.id).ok, false)
  }
  const failedTwin = failWith(state, [g1, g1])
  assert.deepEqual(failedTwin.card.parents, [g1, g1])
  assert.equal(failedTwin.state.inventory[g1], state.inventory[g1] - 2)
  assert.equal(failedTwin.card.generation, 2)
  const secondTwin = failWith(close(failedTwin), [g1, g1])
  assert.equal(secondTwin.card.id, failedTwin.card.id)
  assert.notEqual(secondTwin.instanceId, failedTwin.instanceId)
  assert.equal(getAberrationCopies(secondTwin.state, failedTwin.card.id).length, 2)
  assert.equal(fuseCards({ ...state, inventory: { ...state.inventory, [g1]: 1 } }, g1, g1, forbiddenRoll).ok, false)
  assert.equal(fuseCards(state, g1, 'mamut', forbiddenRoll).ok, false)
  assert.equal(fuseCards(state, g4, 'lobo', forbiddenRoll).ok, false)
})

test('Los fallos avanzados leen los rasgos activos de una construcción y un elemental', () => {
  function merge(pair, key) {
    const state = stock()
    const { variants } = inspectFusionVariants(state, ...pair)
    const index = variants.findIndex(card => card.variantKey === key)
    assert.ok(index >= 0)
    const roll = variants.slice(0, index).reduce((sum, card) => sum + card.probability, 0) + variants[index].probability / 2
    const draws = [0, roll]
    return fuseCards(state, ...pair, () => draws.shift())
  }
  const artificial = merge(['anquilosaurio', 'herrera'], 'living-alloy')
  const bind = failWith(close(artificial), [artificial.card.id, 'obrero'], 'load-bind')
  assert.equal(bind.card.generation, 2)
  assert.ok(bind.card.identity.contributions.some(source => source.parentId === artificial.card.id))
  const elemental = merge(['fenix', 'sirena'], 'elemental')
  const loop = failWith(close(elemental), [elemental.card.id, 'ajolote'], 'sensory-loop')
  assert.ok(loop.card.identity.contributions.some(source => source.parentId === elemental.card.id && source.type === 'power'))
  assert.deepEqual(loop.card.lineage, ['ajolote', 'fenix', 'sirena'])
})

test('Las simulaciones reproducibles de cada generación son consistentes con el 5 %', () => {
  const { state, pairs } = stages()
  const attempts = 20_000
  const results = pairs.map((pair, index) => {
    const random = rng(752_137 + index * 97)
    let failures = 0
    for (let trial = 0; trial < attempts; trial++) {
      const result = fuseCards(state, ...pair, random)
      assert.ok(result.ok, result.error)
      failures += Number(result.outcome === 'aberration')
    }
    const expected = 0.05
    assert.ok(Math.abs(failures - attempts * expected) < 4 * Math.sqrt(attempts * expected * (1 - expected)))
    return { generacion: index + 1, intentos: attempts, fallos: failures, porcentaje: failures * 100 / attempts }
  })
  console.log(JSON.stringify({ simulacion: results }))
})

test('Una esencia mixta guarda diez referencias y puede cruzar variantes avanzadas o iguales', () => {
  const setup = stages()
  let { state } = setup
  const pairs = [...setup.pairs, [setup.g1, setup.g1]]
  const sources = []
  for (const pair of pairs) {
    const result = failWith(state, pair)
    sources.push(result.card.id)
    state = close(result)
  }
  const created = createEssence(state, sources)
  assert.ok(created.ok, created.error)
  const loaded = loadGame(serializeGame(created.state))
  assert.deepEqual(loaded.essences[created.essence.id], created.essence)
  const { essences } = loaded
  const essence = essences[created.essence.id]
  assert.equal(essence.progenitors.reduce((sum, entry) => sum + entry.count, 0), 10)
  assert.deepEqual(new Set(essence.progenitors.map(entry => entry.id)), new Set(pairs.flat()))
  for (const entry of essence.progenitors) {
    assert.deepEqual(entry.card, getCard(entry.id, state))
  }
  assert.ok(sources.every(id => !loaded.inventory[id] && !getAberrationCopies(loaded, id).length && loaded.discovered.includes(id)))
  const generations = new Set()
  const seenPairs = new Set()
  for (let index = 0; index < essence.pairCount; index++) {
    const draws = [(index + 0.5) / essence.pairCount, 0.99]
    const result = useEssence(loaded, essence.id, () => draws.shift())
    assert.ok(result.ok && result.outcome === 'success', result.error)
    assert.equal(result.state.coins, loaded.coins)
    assert.equal(result.state.essences[essence.id], undefined)
    assert.equal(useEssence(close(result), essence.id, forbiddenRoll).ok, false)
    generations.add(result.card.generation)
    seenPairs.add(result.card.parents.join('|'))
  }
  assert.ok(seenPairs.has([setup.g1, setup.g1].join('|')))
  assert.ok(seenPairs.has(sorted([setup.g1, 'lobo']).join('|')))
  assert.equal(seenPairs.size, essence.pairCount)
  assert.deepEqual([...generations].sort(), [1,2,3,4])
  console.log(JSON.stringify({ esencia: { parejas: essence.pairCount, exitos: seenPairs.size, generaciones: [...generations].sort() } }))
})

test('La partida histórica conserva aberraciones, esencia, descubrimientos y revelación', () => {
  const original = JSON.parse(readFileSync(historicURL))
  const state = loadGame(original)
  assert.deepEqual(state.inventory, original.inventory)
  assert.deepEqual(state.discovered, original.discovered)
  assert.deepEqual(state.pendingReveal, original.pendingReveal)
  for (const [id, snapshot] of Object.entries(original.aberrations)) {
    const restored = getCard(id, state)
    assert.equal(restored.family, 'historical')
    for (const [key, value] of Object.entries(snapshot)) assert.deepEqual(restored[key], value)
    const art = getPortrait(restored, state)
    if (ARCHIVED_ABERRATION_PAINTINGS.has(id)) {
      assert.equal(art.format, 'svg')
      assert.match(decodeURIComponent(art.src), /data-contact=/)
    } else {
      assert.equal(art.kind, 'painted')
    }
  }
  const available = Object.values(state.essences)[0]
  assert.equal(available.progenitors.reduce((sum, entry) => sum + entry.count, 0), 10)
  assert.equal(useEssence(state, available.id, forbiddenRoll).ok, false)
  const after = acknowledgeReveal(state, state.pendingReveal.id).state
  assert.equal(useEssence(after, available.id, () => 0.999).outcome, 'success')
  assert.deepEqual(loadGame(serializeGame(state)), state)
})

test('Una esencia histórica sin pareja elegible se conserva para recuperación', () => {
  const { state, g4 } = stages()
  const id = aberrationId([g4, g4], 'interrupted')
  const oldFailure = {
    id, parents: [g4, g4], generation: 5, defect: 'interrupted', failureRulesVersion: 1,
    name: 'Prueba histórica', description: 'Ensayo del límite de generaciones.',
    family: 'incomplete', identity: { visual: 'Forma registrada', contributions: [] }
  }
  const essenceId = 'essence-100'
  const loaded = loadGame({ ...state, aberrations: { ...state.aberrations, [id]: oldFailure },
    essences: { [essenceId]: { sources: Array(5).fill(id) } } })
  const saved = loaded.essences[essenceId]
  assert.equal(saved.pairCount, 0)
  assert.deepEqual(saved.progenitors.map(entry => [entry.id, entry.count]), [[g4, 10]])
  const before = serializeGame(loaded)
  assert.equal(useEssence(loaded, essenceId, forbiddenRoll).ok, false)
  assert.equal(serializeGame(loaded), before)
  assert.deepEqual(loadGame(before).essences[essenceId], saved)
})

test('El piloto tiene ocho archivos definitivos propios y los SVG se resuelven bajo demanda', () => {
  const { state } = stages()
  const digests = new Set()
  const families = new Set()
  for (const sample of ABERRATION_PILOT) {
    const { variants } = inspectAberrationVariants(state, ...sample.parents)
    const card = variants.find(variant => variant.id === aberrationId(sample.parents, sample.key))
    assert.ok(card)
    assert.equal(card.identity.illustration.status, 'definitiva')
    assert.equal(getPortrait(card, state).src, assetPortrait(sample.asset))
    const file = readFileSync(new URL('../docs/assets/' + sample.asset + '.webp', import.meta.url))
    assert.equal(file.toString('ascii', 8, 12), 'WEBP')
    digests.add(createHash('sha256').update(file).digest('hex'))
    families.add(card.family)
  }
  assert.equal(digests.size, 8)
  assert.equal(families.size, 8)
  const card = inspectAberrationVariants(state, 'civil', 'civil').variants[0]
  const eager = getPortrait(card, state)
  assert.equal(eager.kind, 'generated')
  assert.match(eager.src, /^data:image\/svg\+xml/)
  assert.equal(getPortrait(card, state, 1, { defer: true }).src, null)
})

test('Los ocho fallos del piloto definen una obstrucción corporal y conservan sus identificadores', () => {
  const { state } = stages()
  const expected = {
    'axis-lock': ['locomotion', 'stability'],
    'sensory-loop': ['coordination', 'perception'],
    'load-bind': ['structure', 'locomotion'],
    'phase-bleed': ['form', 'locomotion'],
    'blocked-craft': ['respiration', 'manipulation'],
    'domain-knot': ['form', 'stability'],
    'interrupted': ['locomotion', 'stability'],
    overgrowth: ['structure', 'locomotion'],
  }
  for (const sample of ABERRATION_PILOT) {
    const failure = failWith(state, sample.parents, sample.key)
    assert.equal(failure.card.id, aberrationId(sample.parents, sample.key))
    assert.deepEqual(failure.card.identity.impairments.map(block => block.axis), expected[sample.key])
    assert.equal(failure.card.stats, null)
  }
})
