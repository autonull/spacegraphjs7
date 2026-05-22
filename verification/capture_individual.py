from playwright.sync_api import sync_playwright
import os
import time

def capture_individual_nodes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        url_test = "http://localhost:5173/?demo=html-test"
        print(f"Navigating to {url_test}")
        try:
            page.goto(url_test, timeout=60000)
            page.wait_for_function("window.__DEMO_READY === true", timeout=10000)
            time.sleep(5)

            # Target the specific node by ID
            # In HtmlNode.ts: this.domElement.id = `node-html-${spec.id}`;
            raw_node = page.locator("#node-html-raw-html")
            if raw_node.count() > 0:
                raw_node.screenshot(path="verification/node-raw-html.png")
                print("Saved verification/node-raw-html.png")
            else:
                print("Could not find #node-html-raw-html")

            glass_node = page.locator("#node-html-glass-node")
            if glass_node.count() > 0:
                glass_node.screenshot(path="verification/node-glass.png")
                print("Saved verification/node-glass.png")

        except Exception as e:
            print(f"Error: {e}")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    capture_individual_nodes()
