"""Pruebas de Chromium. Servir docs como Quimeraria/ y ejecutar con Playwright de Python."""
import asyncio
import base64
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

from playwright.async_api import async_playwright, expect

URL = os.environ.get("QUIMERARIA_URL", "http://127.0.0.1:8065/Quimeraria/")
OUTPUT = Path(os.environ.get("QUIMERARIA_EVIDENCE", "/tmp/quimeraria-evidence"))
KEY = "quimeraria:partida:v1"
SECTIONS = {
    "forja": ("index.html#forja", "Forja"),
    "alquimia": ("index.html#alquimia", "Alquimia"),
    "coleccion": ("index.html#coleccion", "Colección"),
    "sobres": ("index.html#sobres", "Sobres"),
    "expediciones": ("index.html#expediciones", "Expediciones"),
    "entrenamiento": ("training.html", "Entrenamiento"),
    "arena": ("arena.html", "Arena"),
    "santuario": ("sanctuary.html", "Santuario"),
}
ERRORS = []


def observe(page):
    page.on("pageerror", lambda error: ERRORS.append(str(error)))
    page.on("console", lambda msg: ERRORS.append(f"{msg.text} · {msg.location}") if msg.type == "error" else None)
    page.on("response", lambda res: ERRORS.append(f"{res.status} {res.url}") if res.status >= 400 else None)


async def prepare(browser, width, clinical=True, balance=120):
    ctx = await browser.new_context(
        viewport={"width": width, "height": 940 if width > 500 else 852},
        is_mobile=width < 500, has_touch=width < 500,
        reduced_motion="reduce" if width in [360, 430] else "no-preference",
    )
    page = await ctx.new_page()
    observe(page)
    await page.goto(URL)
    await page.evaluate("""async ([key,clinical,balance])=>{
      const {createGame}=await import('./engine.js');
      const {CARDS}=await import('./catalog.js');
      const {arenaProgress}=await import('./arena-records.js');
      const game=createGame();
      game.coins=balance;
      game.inventory=Object.fromEntries(CARDS.map(card=>[card.id,1]));
      Object.assign(game.inventory,{lobo:3,mamut:2,alquimista:2,medica:2});
      game.arena={...arenaProgress(game),points:190,peak:190};
      if(clinical) game.health={
        "legacy:lobo:1":{fatigue:74,wound:2,family:"bio"},
        "legacy:mamut:1":{fatigue:100,wound:3,family:"bio"},
        "legacy:thor:0":{fatigue:53,wound:1,family:"arcane"},
        "legacy:obrero:0":{fatigue:82,wound:0,family:null}};
      localStorage.setItem(key,JSON.stringify(game));
    }""", [KEY, clinical, balance])
    await page.reload()
    return ctx, page


async def save(page):
    return await page.evaluate("key=>JSON.parse(localStorage.getItem(key))", KEY)


async def fit(page):
    actual = await page.evaluate("({doc:document.documentElement.scrollWidth, viewport:innerWidth})")
    assert actual["doc"] <= actual["viewport"], (page.url, actual)


async def header(page, section, mobile=False):
    links = page.locator("#game-nav-links a")
    await expect(links).to_have_count(len(SECTIONS))
    assert await links.evaluate_all("els=>els.map(el=>el.dataset.section)") == list(SECTIONS)
    await expect(page.locator("#game-nav-links [aria-current]")).to_have_attribute("data-section", section)
    await fit(page)
    if mobile:
        await expect(page.locator("#game-nav-current")).to_have_text(SECTIONS[section][1])
        await expect(page.locator("#game-nav-toggle")).to_have_attribute("aria-expanded", "false")
        await expect(page.locator("#game-nav-links")).to_be_hidden()
    return await page.locator(".game-nav-inner").bounding_box()


async def go(page, section, mobile=False):
    if mobile:
        await page.locator("#game-nav-toggle").tap()
        await expect(page.locator("#game-nav-toggle")).to_have_attribute("aria-expanded", "true")
    link = page.locator(f'#game-nav-links [data-section="{section}"]')
    await (link.tap() if mobile else link.click())
    await header(page, section, mobile)


async def images(page):
    await page.evaluate("""async()=>{
      const imgs=[...document.images].filter(img=>img.hasAttribute('src'));
      await Promise.all(imgs.map(async img=>{img.loading='eager';await img.decode()}));
    }""")


async def shot(page, label, check_images=True):
    if check_images:
        await images(page)
    await page.screenshot(path=OUTPUT / f"{label}.jpg", type="jpeg", quality=88)


async def capture_video(context, page):
    cdp = await context.new_cdp_session(page)
    frames = []
    pending = []

    async def collect(data):
        await cdp.send("Page.screencastFrameAck", {"sessionId": data["sessionId"]})
        frames.append((data["metadata"]["timestamp"], data["data"]))

    cdp.on("Page.screencastFrame", lambda event: pending.append(asyncio.create_task(collect(event))))
    await cdp.send("Page.enable")
    await cdp.send("Page.startScreencast", {
        "format": "jpeg", "quality": 80, "maxWidth": 1110, "maxHeight": 810, "everyNthFrame": 2,
    })

    async def stop():
        await cdp.send("Page.stopScreencast")
        await asyncio.gather(*pending)
        assert len(frames) >= 12, len(frames)
        frames.sort()
        with TemporaryDirectory(prefix="quim-video-") as path:
            folder = Path(path)
            entries = []
            for i, (timestamp, data) in enumerate(frames):
                target = folder / f"{i:05}.jpg"
                target.write_bytes(base64.b64decode(data))
                duration = min(1.4, max(.04, frames[i+1][0]-timestamp)) if i+1 < len(frames) else .8
                entries.extend([f"file '{target}'", f"duration {duration:.3f}"])
            entries.append(f"file '{target}'")
            manifest = folder / "frames.txt"
            manifest.write_text("\n".join(entries)+"\n")
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                            "-i", str(manifest), "-vf", "fps=25,scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264",
                            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUTPUT / "santuario.mp4")], check=True)
        print(f"Grabación real · {len(frames)} fotogramas", flush=True)
    return stop


async def lobo(page):
    filters = page.locator(".sanctuary-filters")
    if await filters.get_attribute("open") is None:
        await filters.locator("summary").click()
    await page.locator("#patient-search").fill("Lobo")
    await expect(page.locator(".patient-group summary")).to_contain_text("Descansada")
    await expect(page.locator(".patient-group [data-id=\"legacy:lobo:1\"]")).to_have_count(0)
    await page.locator('[data-care="detail"][data-id="legacy:lobo:1"]').click()
    await expect(page.locator("#sanctuary-dialog")).to_contain_text("Herida moderada")
    await expect(page.locator(".creature-health-stats")).to_contain_text("→")


async def instant(page):
    await page.get_by_role("button", name="Resolver combate").click()
    await page.get_by_role("button", name="Resolver ahora").click()
    await expect(page.locator(".results")).to_be_visible()


async def desktop(browser):
    ctx, page = await prepare(browser, 1440)
    reference = await header(page, "forja")
    await shot(page, "01-forja")
    stop = await capture_video(ctx, page) if os.getenv("QUIMERARIA_RECORD", "1") == "1" else None
    for section, label in [("entrenamiento", "02-entrenamiento"), ("arena", "03-arena"), ("santuario", "04-santuario")]:
        await go(page, section)
        assert await header(page, section) == reference
        await shot(page, label)
        await page.wait_for_timeout(400)
    for room in ["taller", "arcana", "descanso", "enfermeria"]:
        await page.locator(f'#sanctuary-areas a[href="#{room}"]').click()
        await expect(page.locator("#sanctuary-room img")).to_have_attribute("src", f"./assets/santuario/{room}.webp")
        await expect(page.locator("#sanctuary-areas [aria-current]")).to_have_attribute("href", f"#{room}")
        await shot(page, f"05-{room}")
        await page.wait_for_timeout(260)
    await page.locator('#specialist-form [name="specialist"]').select_option("legacy:medica:0")
    await page.get_by_role("button", name="Asignar especialista").click()
    await expect(page.locator(".specialist-list")).to_contain_text("Medicina")
    await page.locator("#sanctuary-specialists").scroll_into_view_if_needed()
    await shot(page, "06-especialista")
    await lobo(page)
    await shot(page, "07-ficha")
    await page.locator('[data-care="individual"]').click()
    await page.locator("#sanctuary-treatment-type").select_option("restore")
    await expect(page.locator(".sanctuary-quote")).to_contain_text("10 óbolos")
    await shot(page, "08-cotizacion")
    await page.wait_for_timeout(650)
    await page.locator('[data-care="confirm"]').click()
    await expect(page.locator("#sanctuary-effect")).to_be_visible()
    await page.screenshot(path=OUTPUT / "09-efecto.jpg", quality=88)
    await expect(page.locator("#game-nav-wallet")).to_contain_text("110")
    treated = await save(page)
    assert treated["health"]["legacy:lobo:1"] == {"fatigue": 42, "wound": 0, "family": None, "reserve": 5}
    await page.wait_for_timeout(500)
    await page.locator('[data-care="skip"]').click()
    await expect(page.locator("#sanctuary-effect")).to_be_hidden()
    if stop:
        await stop()
    await page.reload()
    assert await save(page) == treated
    await page.locator('[data-care="free-all"]').click()
    await expect(page.locator(".sanctuary-quote")).to_contain_text("0 óbolos")
    await shot(page, "10-recuperacion-conjunta")
    await page.locator('[data-care="confirm"]').click()
    await expect(page.locator("#sanctuary-status")).to_contain_text("atendidos")
    assert all(not row["fatigue"] and not row["wound"] for row in (await save(page))["health"].values())
    await page.locator('#specialist-form [name="specialist"]').select_option("legacy:alquimista:0")
    await page.get_by_role("button", name="Asignar especialista").click()
    await page.locator('#specialist-form [name="replacement"]').select_option("legacy:medica:0")
    await page.locator('#specialist-form [name="specialist"]').select_option("legacy:medica:1")
    await page.get_by_role("button", name="Sustituir especialista").click()
    await expect(page.locator(".specialist-list")).to_contain_text("Ejemplar 2")
    await page.get_by_role("button", name="Retirar").last.click()
    await expect(page.locator(".specialist-list li")).to_have_count(1)
    await ctx.close()
    print("1440 px · cuatro áreas, especialistas, pago único tras recarga, efectos y recuperación conjunta", flush=True)


async def modalities(browser):
    ctx, page = await prepare(browser, 1440)
    witness = await ctx.new_page()
    observe(witness)
    await witness.goto(URL+"sanctuary.html")
    await go(page, "sobres")
    await page.get_by_role("button", name="Revisar compra").click()
    await page.get_by_role("button", name="Confirmar compra").click()
    await expect(page.locator("#modal")).to_be_hidden()
    after_shop = await save(page)
    balance = after_shop["coins"]
    assert balance < 120 and len(after_shop["packStock"]) == 1
    await expect(witness.locator("#game-nav-wallet strong")).to_have_text(str(balance))
    await go(page, "coleccion")
    await page.locator("#search").fill("Lobo")
    await page.locator('[data-action="detail"][data-id="lobo"]').first.click()
    await page.locator("#card-health-copy").select_option("legacy:lobo:1")
    await expect(page.locator("#card-health-details")).to_contain_text("Herida moderada")
    await page.keyboard.press("Escape")
    await go(page, "forja")
    await page.locator("#search").fill("Lobo")
    await page.locator('[data-action="choose"][data-id="lobo"]').click()
    await page.locator("#search").fill("Alquimista")
    await page.locator('[data-action="choose"][data-id="alquimista"]').click()
    await page.locator('[data-material-copy="0"]').select_option("legacy:lobo:1")
    await expect(page.locator(".forge-health-warning")).to_be_visible()
    await page.evaluate("Math.random=()=>0")
    await page.locator('[data-action="fuse"]').click()
    await expect(witness.locator("#game-nav-wallet strong")).not_to_have_text(str(balance))
    post_fusion=await save(page)
    assert "legacy:lobo:1" not in post_fusion["health"]
    assert "legacy:lobo:2" not in post_fusion["health"]
    assert post_fusion["legacyCopies"]["lobo"] == {"head": 0, "removed": [1]}
    # La revelación puede seguir abierta. La navegación real de esta pestaña continúa desde su URL.
    await page.goto(URL+"training.html")
    await page.locator('#camp-search').fill("Mamut")
    await page.locator('[data-details="mamut"]').click()
    await page.locator("#camp-copy-picker").select_option("legacy:mamut:1")
    await expect(page.locator("#camp-detail")).to_contain_text("Herida grave")
    await expect(page.locator("#camp-detail")).to_contain_text("atributos originales")
    await page.get_by_role("button", name="Añadir este ejemplar").click()
    before_sim = await save(page)
    await page.locator("#camp-start").click()
    await instant(page)
    assert await save(page) == before_sim
    await go(page, "arena")
    await page.locator('[data-camp="arena-pick"]').first.click()
    await page.locator("#camp-search").fill("Mamut")
    await page.locator('[data-details="mamut"]').click()
    await page.locator("#camp-copy-picker").select_option("legacy:mamut:1")
    await expect(page.get_by_role("button", name="Añadir este ejemplar")).to_be_disabled()
    await page.keyboard.press("Escape")
    await page.locator("#camp-start").click()
    await expect(page.locator("#scene")).to_be_visible()
    await witness.reload()
    await witness.locator(".sanctuary-filters summary").click()
    await witness.locator("#patient-search").fill("Lobo")
    await witness.locator('[data-care="detail"][data-id="legacy:lobo:0"]').click()
    await expect(witness.locator("#sanctuary-dialog")).to_contain_text("Ocupada en Arena")
    await witness.keyboard.press("Escape")
    await instant(page)
    await expect(page.locator("#arena-health-result")).to_contain_text("Fatiga 0 →")
    await expect(page.locator("#arena-health-result")).to_contain_text("Lobo")
    await shot(page, "11-resultados-arena")
    after_arena = await save(page)
    assert after_arena["coins"] > post_fusion["coins"]
    await expect(witness.locator("#game-nav-wallet strong")).to_have_text(str(after_arena["coins"]))
    assert len(after_arena["arena"]["history"][0]["health"]) == 3
    await page.reload()
    assert await save(page) == after_arena
    await page.get_by_text("Cuidados del último encuentro", exact=True).click()
    await page.get_by_role("button", name="Recuperar escuadra gratis").click()
    await expect(page.locator("#arena-care-message")).to_contain_text("Escuadra recuperada")
    assert "legacy:lobo:0" not in (await save(page))["health"]
    await page.goto(URL+"health-lab.html")
    await expect(page.locator("#simulation-report ol li")).to_have_count(10)
    await page.locator('[name="scenario"]').select_option("rotativa")
    await page.locator('[name="matches"]').select_option("5")
    before_lab = await save(page)
    await page.get_by_role("button",name="Simular").click()
    await expect(page.locator("#simulation-report ol li")).to_have_count(5)
    assert await save(page) == before_lab
    await ctx.close()
    print("Compras, fusión, recompensas y saldo entre pestañas; entrenamiento, Arena, recarga y diagnóstico", flush=True)


async def wounded_result(browser):
    ctx, page = await prepare(browser, 1440, clinical=False)
    await go(page, "arena")
    await page.locator('[data-camp="arena-pick"]').nth(2).click()
    await page.locator("#camp-start").click()
    await instant(page)
    await expect(page.locator(".results h1")).to_have_text("Derrota")
    await expect(page.locator("#arena-health-result")).to_contain_text("Herida leve")
    actual = await save(page)
    assert actual["arena"]["history"][0]["health"][0]["injury"] == 1
    assert actual["health"]["legacy:lobo:0"]["wound"] == 1
    await shot(page, "15-heridas-de-arena")
    await page.reload()
    assert await save(page) == actual
    await page.get_by_text("Cuidados del último encuentro", exact=True).click()
    await page.get_by_role("button", name="Recuperar escuadra gratis").click()
    await expect(page.locator("#arena-care-message")).to_contain_text("Escuadra recuperada")
    assert not (await save(page))["health"]
    await ctx.close()
    print("Derrota real: heridas y fatiga persistentes, recuperación gratuita desde el historial", flush=True)


async def mobile(browser, width):
    ctx, page = await prepare(browser, width, balance=0)
    await header(page, "forja", True)
    await page.locator("#game-nav-toggle").tap()
    await expect(page.locator("#game-nav-links [data-section]")).to_have_count(8)
    await fit(page)
    await shot(page, f"12-menu-{width}")
    await page.keyboard.press("Escape")
    if await page.locator("#game-nav-toggle").get_attribute("aria-expanded") == "true":
        await page.locator("#game-nav-toggle").tap()
    for section in ["alquimia", "coleccion", "sobres", "expediciones", "entrenamiento", "arena", "santuario", "forja", "santuario"]:
        await go(page, section, True)
        await expect(page.locator("#game-nav-wallet strong")).to_have_text("0")
    await lobo(page)
    await shot(page, f"13-ficha-{width}")
    await page.locator('[data-care="individual"]').tap()
    await page.locator("#sanctuary-treatment-type").select_option("restore")
    await expect(page.locator('[data-care="confirm"]')).to_be_disabled()
    await page.locator("#sanctuary-treatment-type").select_option("free")
    await page.locator('[data-care="confirm"]').tap()
    await expect(page.locator("#sanctuary-dialog")).to_be_hidden()
    await fit(page)
    assert "legacy:lobo:1" not in (await save(page))["health"]
    if width != 393:
        await expect(page.locator("#sanctuary-effect")).to_be_hidden()
    await page.locator('#specialist-form [name="specialist"]').select_option("legacy:medica:0")
    await page.get_by_role("button", name="Asignar especialista").tap()
    await expect(page.locator(".specialist-list")).to_contain_text("Medicina")
    await page.locator('[data-care="free-all"]').tap()
    await page.locator('[data-care="confirm"]').tap()
    await expect(page.locator("#sanctuary-dialog")).to_be_hidden()
    assert not (await save(page))["health"]
    await go(page, "arena", True)
    await page.locator('[data-camp="arena-pick"]').first.tap()
    await page.locator("#camp-start").tap()
    await expect(page.locator("#scene")).to_be_visible()
    await fit(page)
    await instant(page)
    await fit(page)
    await expect(page.locator("#arena-health-result")).to_be_visible()
    if width==393:
        await page.locator("#arena-health-result").scroll_into_view_if_needed()
        await shot(page,"14-arena-movil")
    await ctx.close()
    print(f"{width} px táctil · ocho rutas, sin desbordamiento, recuperación a saldo cero, especialistas y resultados", flush=True)


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as tool:
        browser = await tool.chromium.launch(executable_path=os.environ.get("CHROMIUM", "/usr/bin/chromium"),
                                             args=["--no-sandbox", "--disable-dev-shm-usage"])
        await desktop(browser)
        await modalities(browser)
        await wounded_result(browser)
        for width in (360, 393, 430):
            await mobile(browser, width)
        await browser.close()
    assert not ERRORS, ERRORS
    print("Sin errores de JavaScript, consola o recursos HTTP", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
