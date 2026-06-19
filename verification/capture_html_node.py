from playwright.sync_api import sync_playwright
import os
import time

def capture_demo_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        # Test html-node demo
        url_node = "http://localhost:5173/?demo=html-node"
        print(f"Navigating to {url_node}")
        try:
            page.goto(url_node, timeout=60000)
            page.wait_for_function("window.__DEMO_READY === true", timeout=10000)
            time.sleep(5) # Give it more time to render
            page.screenshot(path="verification/html-node-screenshot.png")
            print("Saved verification/html-node-screenshot.png")
        except Exception as e:
            print(f"Error capturing html-node: {e}")
            page.screenshot(path="verification/html-node-error.png")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    capture_demo_screenshots()
