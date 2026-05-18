from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_fractal(page: Page):
    print("Starting verification at http://localhost:5173/index.html?demo=fractalComplex")
    page.on('console', lambda msg: print(f'[Browser] {msg.text}'))

    try:
        page.goto("http://localhost:5173/index.html?demo=fractalComplex", timeout=90000)
    except Exception as e:
        print(f"Goto error: {e}")

    # Just wait a long time and take screenshot
    time.sleep(20)
    page.screenshot(path="verification/fractal_complex_final.png")
    print("Screenshot saved to verification/fractal_complex_final.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        try:
            verify_fractal(page)
        finally:
            browser.close()
