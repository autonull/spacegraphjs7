from playwright.sync_api import sync_playwright, expect
import time
import os

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        page.on("console", lambda msg: print(f"[CONSOLE] {msg.text}"))
        page.on("pageerror", lambda err: print(f"[ERROR] {err}"))

        # Add a stack trace for errors if possible
        def log_error(err):
            print(f"[ERROR] {err.message}")
            if err.stack:
                print(f"[STACK] {err.stack}")
        page.on("pageerror", log_error)

        # 1. Verify Gallery Home
        print("Verifying Gallery Home...")
        page.goto("http://localhost:5173/")
        time.sleep(10) # Give more time for bundling
        page.screenshot(path="verification/gallery_home.png")

        # Get available options for debugging
        options = page.eval_on_selector_all("#demo-select option", "elements => elements.map(el => el.textContent)")
        print(f"Available demos: {options}")

        # 2. Verify System Architecture Demo
        target = "system-architecture"
        if target in options:
            print(f"Selecting {target}...")
            page.select_option("#demo-select", label=target)
            time.sleep(5)
            page.screenshot(path="verification/system_architecture.png")

        # 3. Verify Performance Demo
        target = "performance"
        if target in options:
            print(f"Selecting {target}...")
            page.select_option("#demo-select", label=target)
            time.sleep(5)
            page.screenshot(path="verification/performance.png")

        browser.close()

if __name__ == "__main__":
    verify()
