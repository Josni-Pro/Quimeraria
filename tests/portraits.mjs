import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { CARDS, RECIPES } from '../docs/catalog.js'
import { describeFusionPortrait, fusionPortraitSpec, renderFusionPortrait } from '../docs/fusion-art.js'
import { nameFusion } from '../docs/fusion-names.js'
import { ABERRATION_DEFECTS, ALCHEMY } from '../docs/game-config.js'
import { assetPortrait, getPortrait } from '../docs/illustrations.js'
import {
  acknowledgeReveal, createGame, fuseCards, getCard, loadGame, SAVE_VERSION, serializeGame,
} from '../docs/engine.js'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/quimeraria-v1.json', import.meta.url), 'utf8'))
const originalState = () => ({
  ...createGame(),
  coins: 1_000_000,
  inventory: Object.fromEntries(CARDS.map(card => [card.id, 4])),
})
const baseIds = new Set(CARDS.map(card => card.id))
const baseNames = new Set(CARDS.map(card => card.name))
const expansionCard = {
  ...getCard('civil'), id: 'astronoma', name: 'Astrónoma', art: 'astronoma',
  traits: ['erudicion', 'presagio'], lineage: ['astronoma'],
}
const readAsset = id => readFileSync(new URL(`../docs/assets/${id}.webp`, import.meta.url))
const fusionId = (a, b) => `fusion(${[a.id, b.id].sort().join('+')})`
const forge = (state, first, second) => fuseCards(state, first, second, () => 0)

function verifyIllustrations() {
  const collected = new Map()
  function verifyAsset(art, name) {
    assert.match(art, /^[a-z0-9_-]+$/, `Clave de arte inválida: ${name}`)
    const image = readAsset(art)
    assert.equal(image.toString('ascii', 0, 4), 'RIFF', name)
    assert.equal(image.toString('ascii', 8, 12), 'WEBP', name)
    assert.ok(image.length > 1000, `El archivo del retrato está vacío: ${name}`)
    const digest = createHash('sha256').update(image).digest('hex')
    assert.ok(!collected.has(digest), `${name} comparte retrato con ${collected.get(digest)}`)
    collected.set(digest, name)
  }
  const state = originalState()
  for (const card of CARDS) {
    verifyAsset(card.art, card.name)
    assert.deepEqual(getPortrait(card, state), { src: assetPortrait(card.art), kind: 'painted', level: 0 })
  }
  for (const recipe of RECIPES) {
    const fusion = forge(state, ...recipe.parents)
    assert.ok(fusion.ok, recipe.name)
    const stages = [recipe.art, ...(recipe.artVariants ?? [])]
    assert.equal(stages.length, 3, `La receta especial requiere tres retratos distintos: ${recipe.name}`)
    for (const [index, art] of stages.entries()) {
      const level = index + 1
      verifyAsset(art, `${recipe.name} · ${level}`)
      assert.deepEqual(getPortrait(fusion.card, state, level), { src: assetPortrait(art), kind: 'painted', level })
    }
  }
  return collected.size
}

function assertOriginalName(card) {
  assert.ok(card.name && card.name.length <= 75, `Nombre ausente o demasiado largo: ${card.id}`)
  assert.doesNotMatch(card.name, /[×+<>&]/, `El nombre conserva los separadores del nombre provisional: ${card.name}`)
  assert.ok(!baseNames.has(card.name), `La quimera conserva el nombre de un progenitor: ${card.name}`)
}

function verifyNewNames() {
  const state = originalState()
  const names = new Map()
  const combinations = []
  for (const [index, first] of CARDS.entries()) {
    for (const second of CARDS.slice(index)) {
      const preview = forge(state, first.id, second.id)
      assert.ok(preview.ok, `Fusión rechazada: ${first.name} + ${second.name}`)
      const reversed = forge(state, second.id, first.id)
      assert.ok(reversed.ok)
      const card = preview.card
      assertOriginalName(card)
      assert.equal(card.name, reversed.card.name)
      assert.ok(!names.has(card.name), `${card.name} se repite en ${card.id} y ${names.get(card.name)}`)
      names.set(card.name, card.id)
      combinations.push(card)
    }
  }
  return combinations
}

function verifyAdvancedNames(combinations) {
  const names = new Map(combinations.map(card => [card.name, card.id]))
  const baseCards = CARDS.map(card => getCard(card.id))
  const expandedLookup = id => id === expansionCard.id ? expansionCard : getCard(id)
  const novelId = fusionId(expansionCard, baseCards[0])
  const addedName = nameFusion(novelId, expansionCard, baseCards[0], expandedLookup)
  assertOriginalName({ id: novelId, name: addedName })
  assert.equal(addedName, nameFusion(novelId, baseCards[0], expansionCard, expandedLookup))
  let examined = 0

  function verifyName(first, second) {
    const id = fusionId(first, second)
    const name = nameFusion(id, first, second, getCard)
    assertOriginalName({ id, name })
    assert.ok(!names.has(name), `${name} se repite en ${id} y ${names.get(name)}`)
    names.set(name, id)
    examined += 1
  }

  for (const [index, first] of combinations.entries()) {
    for (const second of baseCards) {
      if (!first.lineage.includes(second.id)) verifyName(first, second)
    }
    for (let other = index + 1; other < combinations.length; other += 1) {
      const second = combinations[other]
      if (!first.lineage.some(id => second.lineage.includes(id))) verifyName(first, second)
    }
  }
  return examined
}

function verifyGeneratedPortraits(combinations) {
  const base = originalState()
  const state = {
    ...base,
    inventory: { ...base.inventory, ...Object.fromEntries(combinations.map(card => [card.id, 1])) },
    fusions: Object.fromEntries(combinations.map(card => [card.id, card])),
  }
  const seeds = new Set()
  for (const card of combinations) {
    const spec = fusionPortraitSpec(card, state)
    assert.ok(spec, card.name)
    assert.equal(spec.groups.length, 2, card.name)
    assert.deepEqual(spec.groups.flat().map(profile => profile.id).sort(), [...card.parents].sort(), card.name)
    assert.ok(spec.groups.every(group => group.every(profile =>
      baseIds.has(profile.id) && profile.face && profile.features.length && profile.colors.length)), card.name)
    assert.ok(!seeds.has(spec.seed), `Composición semilla repetida: ${card.name}`)
    seeds.add(spec.seed)
    assert.ok(describeFusionPortrait(card, state)?.length > 30, card.name)
  }

  const examples = [
    ['fusion(buho+mago)', 'fusion(ajolote+thor)'],
    ['fusion(mamut+mamut)', 'fusion(esfinge+sirena)'],
    ['fusion(anubis+zorro)', 'obrero'],
  ]
  for (const ids of examples) {
    const preview = forge(state, ...ids)
    assert.ok(preview.ok, ids.join(', '))
    const { card } = preview
    const portrait = fusionPortraitSpec(card, state)
    const branches = card.parents.map(id => [...getCard(id, state).lineage].sort()).sort()
    const visualBranches = portrait.groups.map(group => group.map(profile => profile.id).sort()).sort()
    assert.deepEqual(visualBranches, branches, card.name)
  }

  const expanded = { ...state, fusions: { ...state.fusions, [expansionCard.id]: expansionCard } }
  const expansionPair = ['astronoma', 'dragon']
  const expansionResult = {
    ...combinations[0], id: 'fusion(astronoma+dragon)', parents: expansionPair, lineage: expansionPair,
  }
  const extension = fusionPortraitSpec(expansionResult, expanded)
  assert.ok(extension.groups.some(group => group.some(profile => profile.id === expansionCard.id && profile.face)), 'El retrato debe tener un perfil por defecto para cartas nuevas')
  return seeds.size
}

function verifyAdvancedPortraits() {
  const advanced = []
  const defects = new Map()
  let state = originalState()
  let ancestor = getCard(CARDS[0].id)
  for (let generation = 1; generation <= ALCHEMY.maxGeneration; generation += 1) {
    const fusion = forge(state, ancestor.id, CARDS[generation].id)
    assert.ok(fusion.ok, fusion.error)
    const next = acknowledgeReveal(fusion.state, fusion.reveal.id)
    assert.ok(next.ok, next.error)
    state = next.state
    ancestor = fusion.card
    if (generation < 2) continue
    const spec = fusionPortraitSpec(ancestor, state)
    assert.equal(spec.generation, generation)
    assert.deepEqual(spec.groups.map(group => group.map(profile => profile.id).sort()).sort(),
      ancestor.parents.map(id => [...getCard(id, state).lineage].sort()).sort())
    advanced.push({ card: ancestor, state, level: 1 })
  }

  const stocked = originalState()
  for (const [index, first] of CARDS.entries()) {
    for (const second of CARDS.slice(index)) {
      const failure = fuseCards(stocked, first.id, second.id, () => 1)
      assert.ok(failure.ok && failure.outcome === 'aberration', failure.error)
      const { card } = failure
      const spec = fusionPortraitSpec(card, failure.state)
      assert.equal(spec.defect, card.defect)
      assert.ok(ABERRATION_DEFECTS[spec.defect])
      assert.deepEqual(spec.groups.flat().map(profile => profile.id).sort(), [...card.parents].sort())
      if (!defects.has(card.defect)) defects.set(card.defect, { card, state: failure.state, level: 1 })
    }
  }
  assert.equal(defects.size, Object.keys(ABERRATION_DEFECTS).length, 'El catálogo permite ilustrar todos los defectos configurados')
  return { advanced, defects: [...defects.values()] }
}

function verifyCurrentSaveMigration() {
  const loaded = loadGame(JSON.stringify(fixture))
  assert.equal(loaded.version, SAVE_VERSION)
  for (const key of ['coins', 'pity', 'inventory', 'discovered']) {
    assert.deepEqual(loaded[key], fixture[key], `La actualización cambió ${key}`)
  }
  for (const [key, value] of Object.entries(fixture.stats)) assert.deepEqual(loaded.stats[key], value, key)
  for (const [index, entry] of fixture.history.entries()) {
    for (const [key, value] of Object.entries(entry)) assert.deepEqual(loaded.history[index][key], value, key)
  }
  for (const [id, old] of Object.entries(fixture.fusions)) {
    const card = getCard(id, loaded)
    assert.ok(card, `Se perdió la carta ${old.name}`)
    for (const key of ['id', 'category', 'rarity', 'stats', 'ability', 'traits', 'generation', 'parents', 'lineage']) {
      assert.deepEqual(card[key], old[key], `La actualización cambió ${key} de ${old.name}`)
    }
    if (old.name.includes(' × ')) {
      assertOriginalName(card)
      assert.notEqual(card.name, old.name)
      assert.equal(getPortrait(card, loaded).level, 1, 'La quimera anterior debe conservar su retrato de nivel inicial')
    } else {
      assert.equal(card.name, old.name, 'La receta especial debe conservar su nombre')
      assert.equal(getPortrait(card, loaded).src, assetPortrait(old.art), 'La receta especial conserva el retrato base')
    }
    assert.equal(loaded.portraits[id], 1, `El nivel inicial del retrato histórico es incorrecto: ${card.name}`)
  }
  const custom = structuredClone(fixture)
  const historicalId = 'fusion(buho+obrero)'
  custom.fusions[historicalId].name = 'Vigía de la biblioteca'
  assert.equal(getCard(historicalId, loadGame(JSON.stringify(custom))).name, custom.fusions[historicalId].name)
  const restored = loadGame(serializeGame(loaded))
  assert.deepEqual(restored, loaded, 'Volver a cargar la partida migrada debe conservar el resultado')
  assert.doesNotMatch(serializeGame(loaded), /data:image\//, 'Los retratos no deben ocupar espacio dentro de la partida')
  return Object.keys(loaded.fusions).length
}

function verifyPortraitLevels() {
  const state = originalState()
  const first = 'buho'
  const second = 'obrero'
  const levels = []
  const variants = []
  let updated = state
  let id
  let card
  for (const [index, expectedLevel] of [1, 2, 3, 3].entries()) {
    const pair = index % 2 === 0 ? [first, second] : [second, first]
    const forged = forge(updated, ...pair)
    assert.ok(forged.ok)
    if (!id) id = forged.card.id
    if (!card) card = forged.card
    assert.deepEqual(forged.card, card)
    assert.equal(forged.portraitLevel, expectedLevel)
    assert.equal(forged.state.portraits[id], expectedLevel, 'La fusión aumenta y limita el nivel del retrato')
    assert.equal(forged.state.inventory[id], index + 1, 'Las mejoras visuales no cambian la entrega de copias')
    const restored = loadGame(serializeGame(forged.state))
    assert.equal(restored.pendingReveal.id, forged.reveal.id)
    const finalized = acknowledgeReveal(restored, forged.reveal.id)
    assert.ok(finalized.ok)
    updated = finalized.state
    assert.equal(updated.portraits[id], expectedLevel, 'La mejora visual debe conservarse al recargar')
    levels.push(updated.portraits[id])
    variants.push({ card, state: updated, level: expectedLevel })
  }
  return { levels, variants }
}

async function verifyRasterVariants(variants, extra) {
  const modulePath = process.env.QUIMERARIA_CANVAS_MODULE
  if (!modulePath) return null
  const { createCanvas, loadImage } = await import(pathToFileURL(modulePath))
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas')
      return createCanvas(1, 1)
    },
  }
  const sample = createCanvas(24, 24).getContext('2d')
  async function verifyImage({ card, state, level }) {
    const image = renderFusionPortrait(card, state, level)
    assert.match(image, /^data:image\/(webp|png);base64,/)
    const decoded = await loadImage(image)
    assert.ok(decoded.width >= 300 && decoded.height >= 250, 'Resolución insuficiente')
    sample.drawImage(decoded, 0, 0, 24, 24)
    const rgb = sample.getImageData(0, 0, 24, 24).data
    const colors = new Set(Array.from({ length: 24 * 24 }, (_, index) =>
      rgb[index * 4] * 65_536 + rgb[index * 4 + 1] * 256 + rgb[index * 4 + 2]))
    assert.ok(colors.size > 100, 'El retrato debe tener una composición con variedad de color')
    return image
  }
  const images = await Promise.all(variants.map(verifyImage))
  assert.notEqual(images[0], images[1], 'El segundo nivel debe cambiar el retrato')
  assert.notEqual(images[1], images[2], 'El tercer nivel debe cambiar el retrato')
  assert.equal(images[2], images[3], 'El retrato no cambia tras llegar al tope')
  const extraImages = await Promise.all(extra.map(verifyImage))
  assert.equal(new Set(extraImages).size, extra.length, 'El renderizado excepcional no reutiliza una misma imagen')
  return new Set([...images, ...extraImages]).size
}

const combinations = verifyNewNames()
const advancedNames = verifyAdvancedNames(combinations)
const generatedPortraits = verifyGeneratedPortraits(combinations)
const { advanced, defects } = verifyAdvancedPortraits()
const legacyCount = verifyCurrentSaveMigration()
const { levels, variants } = verifyPortraitLevels()
const rasterVariants = await verifyRasterVariants(variants, [...advanced, ...defects])
console.log(JSON.stringify({
  retratosDedicados: verifyIllustrations(),
  nombresGeneradosYDeReceta: combinations.length,
  nombresDeSegundaGeneracion: advancedNames,
  composicionesVerificadas: generatedPortraits,
  generacionesAltasIlustradas: advanced.length,
  defectosIlustrados: defects.length,
  fusionesMigradas: legacyCount,
  progresionVisual: levels,
  ...(rasterVariants && { variantesRasterizadas: rasterVariants }),
}, null, 2))
