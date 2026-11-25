import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { CARDS, RECIPES } from '../docs/catalog.js'
import { CONCEPT_LIMITS, getCreatureConcept, inheritCreatureConcept } from '../docs/creature-concepts.js'
import {
  CAPABILITY_FAMILIES, COMBAT_ROLES, COMBAT_STATS, PROFILE_RULES, UTILITY_FAMILIES, getCreatureProfiles,
} from '../docs/creature-profiles.js'
import {
  SAVE_VERSION, MAX_GENERATION, acknowledgeReveal, createEssence, createGame, fuseCards,
  getCard, getFusionCopies, inspectFusionVariants, loadGame, previewFusion, serializeGame, useEssence,
} from '../docs/engine.js'
import { selectVariant, VARIANT_FAMILIES } from '../docs/fusion-variants.js'
import { ALCHEMY } from '../docs/game-config.js'
import { assetPortrait, getPortrait } from '../docs/illustrations.js'

function stockedGame() {
  return {
    ...createGame(),
    coins: 1_000_000,
    inventory: Object.fromEntries(CARDS.map(card => [card.id, 32])),
    discovered: CARDS.map(card => card.id),
  }
}

function inspect(state, a, b) {
  const inspected = inspectFusionVariants(state, a, b)
  assert.ok(inspected.ok, inspected.error)
  return inspected.variants
}

function close(result) {
  assert.ok(result.ok, result.error)
  const closed = acknowledgeReveal(result.state, result.reveal.id)
  assert.ok(closed.ok, closed.error)
  return closed.state
}

function rollFor(variants, target) {
  let lower = 0
  for (const variant of variants) {
    if (variant.id === target.id) return lower + variant.probability / 2
    lower += variant.probability
  }
  assert.fail(`Variante ausente: ${target.id}`)
}

function forge(state, a, b, target) {
  const variants = inspect(state, a, b)
  const roll = rollFor(variants, target)
  const quote = previewFusion(state, a, b)
  assert.ok(quote.ok && quote.affordable, quote.error)
  const rng = quote.aberrationRate ? [0, roll] : [roll]
  const result = fuseCards(state, a, b, () => {
    assert.ok(rng.length, 'La fusión solicitó una tirada inesperada')
    return rng.shift()
  })
  assert.ok(result.ok, result.error)
  assert.equal(rng.length, 0)
  assert.equal(result.card.id, target.id)
  assert.equal(result.state.coins, state.coins - quote.cost)
  return result
}

function verifyConcept(card, parents = []) {
  const concept = getCreatureConcept(card)
  assert.ok(concept && concept.anatomy && concept.nature && concept.size && concept.intelligence, card.id)
  for (const field of ['tags', 'features', 'knowledge', 'tools', 'materials', 'affinities', 'capabilities', 'utility']) {
    assert.ok(Array.isArray(concept[field]), `${card.id}: ${field}`)
    assert.ok(concept[field].length <= CONCEPT_LIMITS[field], `${card.id}: ${field}`)
    assert.equal(new Set(concept[field]).size, concept[field].length)
  }
  assert.ok(concept.habitat.length <= CONCEPT_LIMITS.habitats)
  assert.ok(concept.inheritance.length <= CONCEPT_LIMITS.inheritance)
  for (const entry of concept.inheritance) {
    const parent = parents.find(candidate => candidate.id === entry.parentId)
    assert.ok(parent, `Solo se heredan atributos de progenitores directos: ${entry.parentId}`)
    assert.ok(getCreatureConcept(parent)[entry.field].includes(entry.value))
    assert.ok(concept[entry.field].includes(entry.value))
  }
}

function verifyProfiles(card) {
  const { combat, utility } = getCreatureProfiles(card)
  const primary = COMBAT_ROLES[combat.role]
  assert.ok(primary, card.id)
  const secondary = combat.secondaryRole ? COMBAT_ROLES[combat.secondaryRole] : null
  if (combat.secondaryRole) assert.ok(secondary && combat.secondaryRole !== combat.role)
  const budget = PROFILE_RULES.baseBudgets[card.generation] + PROFILE_RULES.rarityBudgets[card.rarity]
  assert.equal(combat.powerBudget, budget)
  assert.equal(combat.deploymentCost, PROFILE_RULES.deploymentByGeneration[card.generation])
  assert.deepEqual(Object.keys(combat.stats).sort(), Object.keys(COMBAT_STATS).sort())
  assert.equal(Object.values(combat.stats).reduce((sum, stat) => sum + stat, 0), budget)
  for (const value of Object.values(combat.stats)) {
    assert.ok(Number.isInteger(value))
    assert.ok(value >= Math.floor(budget * PROFILE_RULES.minStatShare))
    assert.ok(value <= Math.floor(budget * PROFILE_RULES.maxStatShare))
  }
  assert.ok(combat.capabilities.length <= PROFILE_RULES.maxCombatCapabilities)
  for (const capability of combat.capabilities) {
    assert.ok(Object.hasOwn(CAPABILITY_FAMILIES, capability))
    assert.ok(primary.capabilities.includes(capability) || secondary?.capabilities.includes(capability),
      `${capability} no es compatible con el rol de ${card.id}`)
  }
  assert.ok(utility.capabilities.length <= PROFILE_RULES.maxUtilityCapabilities)
  for (const capability of utility.capabilities) {
    assert.ok(Object.hasOwn(UTILITY_FAMILIES, capability))
    assert.ok(utility.ratings[capability] >= 1 && utility.ratings[capability] <= 3)
  }
  return combat
}

test('El catálogo completo genera variantes estables bajo demanda y perfiles dentro de sus presupuestos', () => {
  const state = stockedGame()
  const initial = serializeGame(state)
  const allIds = new Set()
  const poolSizes = new Set()
  const familyCounts = new Map()
  const roleCounts = new Map()
  const capabilityCounts = new Map()
  for (const [index, firstBase] of CARDS.entries()) {
    const first = getCard(firstBase.id, state)
    verifyConcept(first)
    verifyProfiles(first)
    for (const secondBase of CARDS.slice(index)) {
      const second = getCard(secondBase.id, state)
      const variants = inspect(state, first.id, second.id)
      assert.deepEqual(variants, inspect(state, second.id, first.id))
      poolSizes.add(variants.length)
      assert.ok(variants.length >= 2, `${first.id} + ${second.id}`)
      const pair = [...new Set([first.id, second.id])].sort()
      const combination = variants[0].combinationId
      const probability = variants.reduce((sum, variant) => sum + variant.probability, 0)
      assert.ok(Math.abs(probability - 1) < 1e-12)
      const concepts = new Set()
      for (const variant of variants) {
        assert.ok(variant.probability > 0 && variant.probability <= 1)
        assert.equal(variant.combinationId, combination)
        assert.ok(!allIds.has(variant.id), variant.id)
        allIds.add(variant.id)
        assert.ok(variant.name && variant.description && variant.generation === 1)
        assert.ok(!concepts.has(variant.description), `Concepto repetido: ${variant.description}`)
        concepts.add(variant.description)
        assert.deepEqual(variant.parents, [first.id, second.id].sort())
        assert.deepEqual(variant.lineage, pair)
        verifyConcept(variant, [first, second])
        const combat = verifyProfiles(variant)
        roleCounts.set(combat.role, (roleCounts.get(combat.role) ?? 0) + 1)
        assert.ok(Object.hasOwn(VARIANT_FAMILIES, variant.family))
        familyCounts.set(variant.family, (familyCounts.get(variant.family) ?? 0) + 1)
        for (const capability of combat.capabilities) {
          capabilityCounts.set(capability, (capabilityCounts.get(capability) ?? 0) + 1)
        }
      }
    }
  }
  assert.ok(poolSizes.size > 1, 'Las combinaciones no deben forzar una cantidad fija de variantes')
  assert.ok(roleCounts.size >= 5, 'Se esperan especializaciones distintas en el catálogo')
  assert.equal(serializeGame(state), initial, 'El diagnóstico no altera la partida')
  console.log(JSON.stringify({ variants: allIds.size, poolSizes: [...poolSizes].sort(), roles: Object.fromEntries(roleCounts),
    interpretations: Object.fromEntries(familyCounts), capabilities: Object.fromEntries(capabilityCounts) }))
})

test('Mamut con Alquimista produce funciones distintas y respeta las probabilidades condicionales', () => {
  const variants = inspect(stockedGame(), 'mamut', 'alquimista')
  assert.ok(variants.length >= 5)
  assert.ok(new Set(variants.map(variant => getCreatureConcept(variant).anatomy)).size >= 3)
  const profiles = variants.map(verifyProfiles)
  assert.ok(new Set(profiles.map(profile => profile.role)).size >= 3)
  assert.ok(new Set(profiles.map(profile => JSON.stringify(profile.stats))).size >= 3)
  assert.equal(new Set(profiles.map(profile => profile.powerBudget)).size, 1,
    'La calidad conceptual no incrementa el presupuesto de poder')
  const byId = new Map(variants.map(variant => [variant.id, 0]))
  let seed = 291_148
  const trials = 40_000
  for (let trial = 0; trial < trials; trial++) {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0
    const variant = selectVariant(variants, seed / 2 ** 32)
    byId.set(variant.id, byId.get(variant.id) + 1)
  }
  for (const variant of variants) {
    assert.equal(selectVariant(variants, rollFor(variants, variant)).id, variant.id)
    const expectation = variant.probability * trials
    const tolerance = Math.max(2, 5 * Math.sqrt(expectation * (1 - variant.probability)))
    assert.ok(Math.abs(byId.get(variant.id) - expectation) <= tolerance, variant.name)
  }
})

test('La herencia interpreta anatomía y evita capacidades físicas incompatibles', () => {
  const state = stockedGame()
  const lobo = getCard('lobo', state)
  const buho = getCard('buho', state)
  const conocedor = getCard('alquimista', state)
  const wingless = inheritCreatureConcept(lobo, buho, {
    anatomy: 'quadruped', tags: ['wingless'], intelligence: 'animal',
  })
  assert.ok(!wingless.tags.includes('winged'))
  const animal = inheritCreatureConcept(lobo, conocedor, { anatomy: 'quadruped', intelligence: 'animal' })
  assert.deepEqual(animal.tools, [])
  assert.deepEqual(animal.knowledge, [])
  const aquatic = inheritCreatureConcept(getCard('pulpo', state), lobo, { anatomy: 'quadruped' })
  assert.ok(!aquatic.habitat.includes('océano'))
})

test('Las evoluciones, formas ancestrales y mitológicas siguen las reglas de inventario', () => {
  const state = stockedGame()
  const fox = inspect(state, 'zorro', 'zorro')
  const wolf = inspect(state, 'lobo', 'lobo')
  const kitsune = fox.find(variant => /kitsune/i.test(variant.name))
  const ancestral = wolf.find(variant => /lobo terrible/i.test(variant.name))
  assert.ok(kitsune && ancestral)
  const result = forge(state, 'zorro', 'zorro', kitsune)
  assert.equal(result.state.inventory.zorro, state.inventory.zorro - 2)
  assert.equal(result.state.inventory[kitsune.id], 1)
  assert.deepEqual(result.card.lineage, ['zorro'])
  assert.deepEqual(result.card.parents, ['zorro', 'zorro'])
  assert.ok(!previewFusion({ ...state, inventory: { zorro: 1 } }, 'zorro', 'zorro').ok)
  assert.ok(fox.some(variant => variant.family === 'evolution' && variant.description !== kitsune.description))
})

test('Las especies convergentes comparten el arte de catálogo y conservan su procedencia', () => {
  let state = stockedGame()
  const first = inspect(state, 'velociraptor', 'fenix')
  const second = inspect(state, 'grifo', 'dragon')
  const variants = [first, second].map(pool => pool.find(variant => variant.concept.speciesId === 'dragon'))
  assert.ok(variants.every(Boolean), 'Dragón debe admitir más de una convergencia coherente')
  const [fromFenix, fromGrifo] = variants
  assert.notEqual(fromFenix.id, fromGrifo.id)
  assert.notEqual(fromFenix.combinationId, fromGrifo.combinationId)
  const dragon = getCard('dragon', state)
  const baseCount = state.inventory.dragon
  const result = forge(state, 'velociraptor', 'fenix', fromFenix)
  assert.equal(result.card.name, dragon.name)
  assert.notEqual(result.card.id, dragon.id)
  assert.equal(result.card.generation, 1)
  assert.deepEqual(result.card.lineage, ['fenix', 'velociraptor'])
  assert.equal(getPortrait(result.card, result.state).src, assetPortrait(dragon.art ?? dragon.id))
  assert.equal(result.state.inventory.dragon, baseCount)
  assert.equal(result.state.inventory[result.card.id], 1)
  state = loadGame(serializeGame(result.state))
  assert.deepEqual(getCard(result.card.id, state), result.card)
  assert.deepEqual(getFusionCopies(state, result.card.id), [{ id: 'copy-1', origin: 'fusion' }])
  assert.deepEqual(state.pendingReveal, result.reveal)
  assert.ok(!fuseCards(state, 'velociraptor', 'fenix', () => assert.fail('No puede volver a tirar al recargar')).ok)
})

test('Dos copias de una variante se consumen juntas sin recuperar una generación inferior', () => {
  let state = stockedGame()
  const target = inspect(state, 'alquimista', 'mamut').at(-1)
  const first = forge(state, 'alquimista', 'mamut', target)
  state = close(first)
  assert.ok(!previewFusion(state, target.id, target.id).ok)
  const repeat = forge(state, 'mamut', 'alquimista', target)
  state = close(repeat)
  assert.equal(state.inventory[target.id], 2)
  const copyIds = getFusionCopies(state, target.id).map(copy => copy.id)
  assert.equal(new Set(copyIds).size, 2)
  const quote = previewFusion(state, target.id, target.id)
  assert.equal(quote.aberrationRate, 0)
  const next = inspect(state, target.id, target.id).at(-1)
  const evolved = forge(state, target.id, target.id, next)
  assert.equal(evolved.state.inventory[target.id], undefined)
  assert.equal(getFusionCopies(evolved.state, target.id).length, 0)
  assert.equal(evolved.state.inventory[next.id], 1)
  assert.equal(next.generation, target.generation + 1)
  assert.deepEqual(next.lineage, target.lineage)
  assert.deepEqual(next.parents, [target.id, target.id])
  assert.ok(evolved.state.discovered.includes(target.id))
  assert.deepEqual(loadGame(serializeGame(evolved.state)), evolved.state)
})

test('Las generaciones posteriores siguen produciendo variantes dentro del límite', () => {
  let state = stockedGame()
  let parent = getCard('zorro', state)
  const founders = ['mamut', 'grifo', 'medica', 'pulpo']
  for (const [index, founder] of founders.entries()) {
    const variants = inspect(state, parent.id, founder)
    for (const variant of variants) {
      verifyProfiles(variant)
      verifyConcept(variant, [parent, getCard(founder, state)])
    }
    const next = forge(state, parent.id, founder, variants.at(-1))
    assert.equal(next.card.generation, index + 1)
    assert.equal(next.card.lineage.length, index + 2)
    state = close(next)
    parent = next.card
  }
  assert.equal(parent.generation, MAX_GENERATION)
  assert.ok(!inspectFusionVariants(state, parent.id, 'lobo').ok)
  assert.ok(!inspectFusionVariants(state, parent.id, parent.id).ok)
  assert.ok(!fuseCards(state, parent.id, 'lobo', () => assert.fail('No debe tirar')).ok)
  assert.deepEqual(loadGame(serializeGame(state)), state)
})

test('Las recetas especiales conservan identidad e ilustraciones', () => {
  const state = stockedGame()
  for (const recipe of RECIPES) {
    const variants = inspect(state, ...recipe.parents)
    const original = variants[0]
    assert.equal(original.name, recipe.name)
    assert.equal(original.art, recipe.art)
    assert.equal(selectVariant(variants, 0).id, original.id)
    assert.ok(variants.some(variant => variant.id !== original.id && variant.art !== original.art))
    assert.equal(getPortrait(original, state).src, assetPortrait(recipe.art))
  }
})

test('La esencia puede recuperar una variante y registra el origen de cada copia', () => {
  const [a, b] = ['alquimista', 'lobo']
  let state = stockedGame()
  const variants = inspect(state, a, b)
  const chosen = variants.at(-1)
  state = close(forge(state, a, b, chosen))
  const failedIds = []
  for (let attempt = 0; attempt < ALCHEMY.aberrationsPerEssence; attempt++) {
    const failure = fuseCards(state, a, b, () => ALCHEMY.successRate)
    assert.equal(failure.outcome, 'aberration')
    failedIds.push(failure.card.id)
    state = close(failure)
  }
  const created = createEssence(state, failedIds)
  assert.ok(created.ok, created.error)
  const pairCount = created.essence.pairCount
  let result
  for (let index = 0; index < pairCount; index++) {
    const rolls = [(index + 0.5) / pairCount, rollFor(variants, chosen)]
    const candidate = useEssence(created.state, created.essence.id, () => rolls.shift())
    if (candidate.card.id === chosen.id) result = candidate
  }
  assert.ok(result, 'La esencia no recuperó la variante solicitada')
  assert.equal(result.state.coins, state.coins)
  assert.equal(result.state.inventory[chosen.id], 2)
  assert.deepEqual(getFusionCopies(result.state, chosen.id).map(copy => copy.origin), ['fusion', 'essence'])
  const restored = loadGame(serializeGame(result.state))
  assert.deepEqual(restored, result.state)
  assert.ok(!useEssence(close({ ...result, state: restored }), created.essence.id).ok)
})

test('El guardado histórico mantiene las cartas exactas y nunca almacena el contenido de sus imágenes', () => {
  const old = JSON.parse(readFileSync(new URL('./fixtures/quimeraria-v1-portraits.json', import.meta.url)))
  for (const version of [1, 2]) {
    const state = loadGame({ ...old, version })
    assert.equal(state.version, SAVE_VERSION)
    assert.equal(state.coins, old.coins)
    assert.deepEqual(state.inventory, old.inventory)
    assert.deepEqual(state.discovered, old.discovered)
    for (const [id, snapshot] of Object.entries(old.fusions)) {
      const restored = getCard(id, state)
      for (const [key, value] of Object.entries(snapshot)) assert.deepEqual(restored[key], value)
      assert.ok(restored.variantId)
      assert.equal(restored.origin, 'legacy')
    }
    assert.doesNotMatch(serializeGame(state), /data:image\//)
    assert.deepEqual(loadGame(serializeGame(state)), state)
  }
})
