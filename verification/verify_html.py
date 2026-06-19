from playwright.sync_api import sync_playwright
import os
import time

def verify_html_node():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # We need to serve the files or use a file path.
        # Since we have a vite config, we might need to run vite or just point to the html.
        # But vite is needed for .ts imports in the html.

        # Let's try to run vite in background.
        # Actually, let's just check if we can run the test-direct.html or similar if it's already working.

        url = "http://localhost:5173/demo/simple-html.html"

        print(f"Navigating to {url}")
        try:
            page.goto(url, timeout=60000)
            # Wait for the node to be rendered.
            page.wait_for_selector('.spacegraph-html-node', timeout=10000)

            # Take a screenshot
            page.screenshot(path="verification/simple-html.png")
            print("Screenshot saved to verification/simple-html.png")

            # Check if 'HELLO WORLD' is visible
            content = page.locator('.spacegraph-html-node').text_content()
            print(f"Node content: {content}")

        except Exception as e:
            print(f"Error: {e}")
            # Take a screenshot of the error state if possible
            page.screenshot(path="verification/error.png")

        browser.close()

if __name__ == "__main__":
    verify_html_node()
