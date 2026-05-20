from playwright.sync_api import sync_playwright
import os
import time

def capture_demo_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        # Test html-test demo
        url_test = "http://localhost:5173/?demo=html-test"
        print(f"Navigating to {url_test}")
        try:
            page.goto(url_test, timeout=60000)
            page.wait_for_function("window.__DEMO_READY === true", timeout=10000)
            time.sleep(2) # Give it a bit more time for any CSS transitions
            page.screenshot(path="verification/html-test-screenshot.png")
            print("Saved verification/html-test-screenshot.png")

            # Check for elements
            html_nodes = page.locator(".spacegraph-html-node").all()
            print(f"Found {len(html_nodes)} HTML nodes")
            for i, node in enumerate(html_nodes):
                visible = node.is_visible()
                box = node.bounding_box()
                content = node.inner_html()
                print(f"Node {i}: visible={visible}, box={box}, content_length={len(content)}")

        except Exception as e:
            print(f"Error capturing html-test: {e}")
            page.screenshot(path="verification/html-test-error.png")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    capture_demo_screenshots()
