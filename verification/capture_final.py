from playwright.sync_api import sync_playwright
import os
import time

def capture_paradigm_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test html-paradigm
        url_paradigm = "http://localhost:8080/?demo=html-paradigm"
        print(f"Navigating to {url_paradigm}")
        try:
            page.goto(url_paradigm, timeout=60000)
            print("Waiting 15 seconds...")
            time.sleep(15)
            page.screenshot(path="verification/html-paradigm-fixed.png")
            print("Saved verification/html-paradigm-fixed.png")
        except Exception as e:
            print(f"Error capturing paradigm: {e}")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    capture_paradigm_screenshots()
