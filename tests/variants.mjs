import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { CARDS, RECIPES } from '../docs/catalog.js'
import { CONCEPT_LIMITS, getCreatureConcept, inheritCreatureConcept } from '../docs/creature-concepts.js'
import { SCALE_LABELS } from '../docs/creature-scale.js'
import {
  CAPABILITY_FAMILIES, COMBAT_ROLES, COMBAT_STATS, PROFILE_RULES, UTILITY_FAMILIES, getCreatureProfiles,
} from '../docs/creature-profiles.js'
import {
  SAVE_VERSION, MAX_GENERATION, acknowledgeReveal, createEssence, createGame, fuseCards,
  getCard, getFusionCopies, inspectFusionVariants, loadGame, previewFusion, serializeGame, useEssence,
} from '../docs/engine.js'
import { selectVariant, VARIANT_FAMILIES } from '../docs/fusion-variants.js'
import { ALCHEMY } from '../docs/game-config.js'
import { assetPortrait, getPortrait, illustrationRecord } from '../docs/illustrations.js'
import { renderProvisionalPortrait } from '../docs/provisional-art.js'

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
  const { scale, depth } = concept
  assert.ok(Object.hasOwn(SCALE_LABELS, scale.category))
  assert.ok(scale.heightM > 0 || scale.lengthM > 0, card.id)
  for (const field of ['heightM', 'lengthM', 'massKg', 'wingspanM']) {
    assert.ok(scale[field] === null || Number.isFinite(scale[field]) && scale[field] > 0, card.id)
  }
  assert.ok(scale.payloadKg >= 0 && scale.form && scale.environment && scale.rationale, card.id)
  assert.ok(depth.expressions.length > 0, card.id)
  if (depth.contributions) {
    assert.deepEqual(depth.contributions.map(entry => entry.parentId), card.parents)
    assert.equal(depth.expressions.length, 2)
  }
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
  const distribution = [0, 0, 0]
  const species = { mythology: new Set(), ancestral: new Set(), convergence: new Set() }
  let exceptional = 0
  let painted = 0
  for (const [index, firstBase] of CARDS.entries()) {
    const first = getCard(firstBase.id, state)
    verifyConcept(first)
    verifyProfiles(first)
    for (const secondBase of CARDS.slice(index)) {
      const second = getCard(secondBase.id, state)
      const variants = inspect(state, first.id, second.id)
      assert.deepEqual(variants, inspect(state, second.id, first.id))
      poolSizes.add(variants.length)
      assert.ok(variants.length >= 1, `${first.id} + ${second.id}`)
      distribution[Math.min(variants.length, 3) - 1]++
      const pair = [...new Set([first.id, second.id])].sort()
      const combination = variants[0].combinationId
      const probability = variants.reduce((sum, variant) => sum + variant.probability, 0)
      assert.ok(Math.abs(probability - 1) < 1e-12)
      const concepts = new Set()
      const provisionalPortraits = new Set()
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
        assert.ok(variant.identity.brief.silhouette && variant.identity.brief.sources.length === 2)
        assert.deepEqual(variant.identity.brief.scale, variant.concept.scale)
        assert.ok(variant.identity.brief.equipmentDimensions && variant.identity.brief.integration)
        const portrait = getPortrait(variant, state)
        if (portrait.kind === 'painted') {
          painted++
          assert.ok(existsSync(new URL(portrait.src, new URL('../docs/', import.meta.url))), variant.id)
        }
        if (portrait.format === 'svg') {
          assert.ok(!provisionalPortraits.has(portrait.src), `SVG repetido en ${combination}`)
          provisionalPortraits.add(portrait.src)
        }
        const combat = verifyProfiles(variant)
        roleCounts.set(combat.role, (roleCounts.get(combat.role) ?? 0) + 1)
        assert.ok(Object.hasOwn(VARIANT_FAMILIES, variant.family))
        familyCounts.set(variant.family, (familyCounts.get(variant.family) ?? 0) + 1)
        species[variant.family]?.add(variant.concept.speciesId)
        if (variant.quality === 'exceptional') exceptional++
        for (const capability of combat.capabilities) {
          capabilityCounts.set(capability, (capabilityCounts.get(capability) ?? 0) + 1)
        }
      }
    }
  }
  assert.ok(poolSizes.size > 1, 'Las combinaciones no deben forzar una cantidad fija de variantes')
  assert.ok(roleCounts.size >= 5, 'Se esperan especializaciones distintas en el catálogo')
  assert.equal(serializeGame(state), initial, 'El diagnóstico no altera la partida')
  const pairs = distribution.reduce((total, count) => total + count, 0)
  assert.equal(pairs, CARDS.length * (CARDS.length + 1) / 2)
  console.log(JSON.stringify({ baseCards: CARDS.length, pairs, variants: allIds.size, distribution,
    mean: allIds.size / pairs, exceptional, painted, provisional: allIds.size - painted,
    recognizedSpecies: Object.fromEntries(Object.entries(species).map(([family, ids]) => [family, [...ids]])),
    poolSizes: [...poolSizes].sort(), roles: Object.fromEntries(roleCounts),
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
    assert.ok(variants.slice(1).every(variant => variant.id !== original.id && variant.art !== original.art))
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

test('El refinamiento distingue vuelo, profesión y manifestación divina', () => {
  const state = stockedGame()
  const owls = inspect(state, 'buho', 'buho')
  assert.equal(owls.filter(card => card.identity.shape === 'aerial').length, 1)
  assert.ok(!owls.some(card => card.variantKey === 'aerial'))
  const medic = inspect(state, 'medica', 'buho').find(card => card.variantKey === 'air-rescue')
  assert.equal(getCreatureProfiles(medic).combat.role, 'healer')
  assert.equal(getCreatureProfiles(medic).combat.mobility, 'aerial')
  assert.ok(getCreatureProfiles(medic).utility.capabilities.includes('transport'))
  assert.doesNotMatch(medic.name, /Planeador/)
  const gods = inspect(state, 'atenea', 'thor').find(card => card.quality === 'exceptional')
  assert.equal(gods.name, 'Égida del Trueno')
  assert.equal(gods.concept.anatomy, 'construct')
  assert.match(gods.description, /escudo de Atenea.*martillo de Thor/)
  assert.equal(inspect(state, 'atenea', 'lobo').some(card => card.quality === 'exceptional'), false)
})

test('Registro, fichas y retratos comparten referencias reales', () => {
  const state = stockedGame()
  const recognized = [
    ['musico', 'pulpo', 'sirena'],
    ['buho', 'dragon', 'fenix'],
  ]
  for (const [first, second, species] of recognized) {
    const output = inspect(state, first, second).find(card => card.variantKey === species)
    const portrait = getPortrait(output, state)
    assert.equal(portrait.src, assetPortrait(getCard(species, state).art))
    assert.equal(output.identity.illustration.final, species)
    assert.equal(output.generation, 1)
  }
  const carrier = inspect(state, 'pulpo', 'mamut').find(card => card.variantKey === 'shore-carrier')
  assert.equal(carrier.identity.bodySource, 'mamut')
  assert.equal(carrier.concept.anatomy, 'quadruped')
  assert.ok(decodeURIComponent(renderProvisionalPortrait(carrier, 1)).includes('fill="#2c777f"'))
  const classic = inspect(state, 'alquimista', 'mamut')[0]
  assert.equal(classic.identity.illustration.final, 'fusiones/alquimista--mamut')
  assert.equal(illustrationRecord(classic, getPortrait(classic, state)).status, classic.identity.illustration.status)
  assert.equal(getPortrait(classic, state).src, assetPortrait(classic.identity.illustration.final))
  assert.match(classic.identity.brief.silhouette, /trompa/)
  assert.equal(classic.identity.brief.sources.length, 2)
  const colossus = inspect(state, 'alquimista', 'mamut').at(-1)
  assert.equal(getPortrait(colossus, state).src, './assets/piloto/coloso-alquimico.webp')
  assert.ok(readFileSync(new URL('../docs/assets/piloto/coloso-alquimico.webp', import.meta.url)).length > 0)
})

test('Una partida real del motor anterior conserva variantes fuera del sorteo futuro', () => {
  const prior = JSON.parse(readFileSync(new URL('./fixtures/quimeraria-v3-before-refinement.json', import.meta.url)))
  const state = loadGame(prior)
  assert.deepEqual(state, prior)
  const owlId = 'variant(fusion(buho+buho);aerial)'
  const foxId = 'variant(fusion(zorro+zorro);kitsune)'
  assert.equal(state.inventory[owlId], 1)
  assert.equal(getCard(owlId, state).name, 'Planeador de Búho')
  assert.ok(!inspect(state, 'buho', 'buho').some(card => card.id === owlId))
  assert.equal(getPortrait(getCard(foxId, state), state).src, './assets/piloto/kitsune.webp')
  assert.deepEqual(loadGame(serializeGame(state)), state)
})

test('La ampliación da interpretaciones propias a cartas iguales y especies reconocibles', () => {
  const state = stockedGame()
  const forms = [
    ['atenea', 'atenea', 'hundred-pieces', 'divine', /hilos tensados/],
    ['esfinge', 'esfinge', 'echo-trial', 'evolution', /garganta/],
    ['arquitecta', 'arquitecta', 'counterfort-archive', 'construct', /pasarela plegable/],
    ['abogado', 'abogado', 'civic-table', 'construct', /sello sobre cera/],
    ['velociraptor', 'velociraptor', 'utahraptor', 'ancestral', /garra/],
    ['rinoceronte_lanudo', 'rinoceronte_lanudo', 'elasmotherium', 'ancestral', /cuerno/],
    ['esfinge', 'mamut', 'smilodon', 'ancestral', /caninos/],
    ['anubis', 'esfinge', 'aker', 'mythology', /disco solar/],
    ['quetzalcoatl', 'thor', 'jormungandr', 'mythology', /propia cola/],
    ['grifo', 'lobo', 'simurgh', 'mythology', /canino/],
    ['ajolote', 'lobo', 'ahuizotl', 'mythology', /mano prensil/],
  ]
  for (const [a, b, key, family, feature] of forms) {
    const card = inspect(state, a, b).find(variant => variant.variantKey === key)
    assert.ok(card, key)
    assert.equal(card.id, `variant(fusion(${[a, b].sort().join('+')});${key})`)
    assert.equal(card.family, family)
    assert.match(card.identity.brief.silhouette, feature)
    assert.equal(inspect(state, b, a).find(variant => variant.variantKey === key).id, card.id)
    verifyConcept(card, [getCard(a, state), getCard(b, state)])
    verifyProfiles(card)
    if (a === b) {
      const result = forge(state, a, b, card)
      assert.equal(result.state.inventory[a], state.inventory[a] - 2)
      assert.deepEqual(result.card.parents, [a, a])
      assert.ok(!previewFusion({ ...state, inventory: { ...state.inventory, [a]: 1 } }, a, a).ok)
    }
  }
  assert.ok(!inspect(state, 'arquitecta', 'abogado').some(card => /counterfort-archive|civic-table/.test(card.variantKey)))
})

test('Adaptaciones e instituciones se generan en G2 a partir de conceptos inmediatos', () => {
  let state = stockedGame()
  const wolf = inspect(state, 'lobo', 'lobo').find(variant => variant.variantKey === 'trail-evolution')
  state = close(forge(state, 'lobo', 'lobo', wolf))
  const adapted = inspect(state, wolf.id, 'triceratops').find(card => card.variantKey === 'scent-vanguard')
  assert.ok(adapted)
  assert.equal(adapted.family, 'adaptation')
  assert.equal(adapted.generation, 2)
  assert.deepEqual(adapted.lineage, ['lobo', 'triceratops'])
  assert.match(adapted.description, /Huella Fría/)
  verifyConcept(adapted, [wolf, getCard('triceratops', state)])
  verifyProfiles(adapted)
  state = close(forge(state, wolf.id, 'triceratops', adapted))
  assert.equal(state.inventory[wolf.id], undefined)
  assert.deepEqual(getCard(adapted.id, loadGame(serializeGame(state))), getCard(adapted.id, state))

  const master = inspect(state, 'arquitecta', 'arquitecta').find(variant => variant.variantKey === 'mastery')
  for (let copy = 0; copy < 2; copy++) state = close(forge(state, 'arquitecta', 'arquitecta', master))
  const archive = inspect(state, master.id, master.id).find(card => card.variantKey === 'counterfort-archive')
  assert.ok(archive)
  assert.equal(archive.generation, 2)
  assert.equal(archive.concept.profession, 'arquitectura')
  assert.equal(archive.identity.illustration.status, 'procedural SVG')
  verifyConcept(archive, [master, master])
  verifyProfiles(archive)
  assert.equal(forge(state, master.id, master.id, archive).state.inventory[master.id], undefined)
})

test('Grifo y Esfinge convergen con arte de catálogo e impiden regresar a una especie del linaje', () => {
  let state = stockedGame()
  for (const [a, b, species] of [['buho', 'esfinge', 'grifo'], ['fenix', 'esfinge', 'grifo'], ['atenea', 'grifo', 'esfinge']]) {
    const target = inspect(state, a, b).find(card => card.variantKey === species)
    assert.ok(target)
    const result = forge(state, a, b, target)
    const { card } = result
    assert.notEqual(card.id, species)
    assert.equal(card.name, getCard(species, state).name)
    assert.equal(card.generation, 1)
    assert.deepEqual(card.parents, [a, b].sort())
    assert.deepEqual(card.lineage, [a, b].sort())
    assert.equal(card.origin, 'fusion')
    assert.equal(getPortrait(card, result.state).src, assetPortrait(getCard(species, state).art))
    assert.equal(result.state.inventory[species], state.inventory[species])
    assert.deepEqual(getFusionCopies(result.state, card.id).map(copy => copy.origin), ['fusion'])
    assert.deepEqual(getCard(card.id, loadGame(serializeGame(result.state))), card)
    state = close(result)
    const partner = species === 'grifo' ? 'atenea' : 'buho'
    const ancestor = species === 'grifo' ? 'esfinge' : 'grifo'
    assert.ok(!inspect(state, card.id, partner).some(option => option.variantKey === ancestor))
  }

  const owl = inspect(state, 'buho', 'buho').find(card => card.variantKey === 'evolution')
  state = close(forge(state, 'buho', 'buho', owl))
  const griffin = inspect(state, owl.id, 'esfinge').find(card => card.variantKey === 'grifo')
  assert.ok(griffin)
  const result = forge(state, owl.id, 'esfinge', griffin)
  assert.equal(result.card.generation, 2)
  assert.deepEqual(result.card.lineage, ['buho', 'esfinge'])
  assert.equal(getPortrait(result.card, result.state).src, './assets/grifo.webp')
  verifyConcept(result.card, [owl, getCard('esfinge', state)])
  verifyProfiles(result.card)
})

test('La escala depende del cuerpo y la función, incluida la de los rescatistas', () => {
  const state = stockedGame()
  const defaultOwl = inspect(state, 'buho', 'mago')[0]
  assert.equal(defaultOwl.concept.scale.category, 'small')
  assert.equal(defaultOwl.concept.scale.heightM, getCreatureConcept(getCard('buho', state)).scale.heightM)
  for (const parent of ['buho', 'fenix']) {
    const rescue = inspect(state, parent, 'medica').find(card => card.variantKey === 'air-rescue')
    assert.equal(rescue.concept.scale.category, 'human')
    assert.equal(rescue.concept.scale.heightM, 1.7)
    assert.ok(rescue.concept.scale.wingspanM > rescue.concept.scale.heightM)
    assert.match(rescue.identity.brief.equipmentDimensions, /anclaje fijo/)
  }
  const custodian = inspect(state, 'anubis', 'thor').find(card => card.variantKey === 'divine-manifest')
  const citadel = inspect(state, 'atenea', 'thor').find(card => card.variantKey === 'divine-manifest')
  assert.equal(custodian.quality, citadel.quality)
  assert.equal(custodian.concept.scale.category, 'human')
  assert.equal(citadel.concept.scale.category, 'colossal')
  assert.match(citadel.concept.scale.rationale, /comunidad/)
})

test('Colonia, Foco y forma anfibia integran los dos aportes en un solo cuerpo funcional', () => {
  const state = stockedGame()
  const pool = inspect(state, 'sirena', 'pulpo')
  const colony = pool.find(card => card.variantKey === 'reef-colony')
  const focus = pool.find(card => card.variantKey === 'elemental')
  assert.match(colony.description, /red nerviosa.*tejido circulatorio compartido/)
  assert.match(focus.description, /remolino central recompone todo el cuerpo/)
  assert.match(focus.identity.brief.sources.find(source => source.id === 'pulpo').trait, /control distribuido/)
  const [classic, watcher] = inspect(state, 'ajolote', 'zorro')
  assert.equal(classic.concept.scale.form, 'quadruped')
  assert.match(classic.description, /oído y olfato.*regenera/)
  assert.match(watcher.description, /propia circulación/)
  assert.equal(getPortrait(watcher, state).format, 'svg')
  assert.equal(getPortrait(classic, state).format, 'svg')
})

test('Las fichas divinas expresan dominios que se integran y se pueden transmitir en G2', () => {
  let state = stockedGame()
  const weaver = inspect(state, 'atenea', 'quetzalcoatl').find(card => card.variantKey === 'divine-manifest')
  assert.equal(weaver.name, 'Tejedora del Viento')
  assert.match(weaver.description, /Ehécatl.*estrategia defensiva/)
  assert.equal(weaver.concept.scale.form, 'serpentine')
  const tribunal = inspect(state, 'anubis', 'atenea').find(card => card.variantKey === 'divine-manifest')
  assert.equal(tribunal.name, 'Tribunal de las Dos Puertas')
  assert.match(tribunal.description, /almas.*pesaje.*previsión/)
  assert.ok(tribunal.identity.brief.sources.every(source => source.mythology && source.action))
  state = close(forge(state, 'atenea', 'quetzalcoatl', weaver))
  const descendants = inspect(state, weaver.id, 'sirena')
  for (const card of descendants) {
    const source = card.concept.depth.contributions.find(entry => entry.parentId === weaver.id)
    assert.ok(weaver.concept.depth.expressions.some(entry => entry.trait === source.trait))
    verifyConcept(card, [weaver, getCard('sirena', state)])
  }
})
