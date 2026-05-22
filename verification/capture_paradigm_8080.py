from playwright.sync_api import sync_playwright
import os
import time

def capture_paradigm_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test html-simple-test
        url_simple = "http://localhost:8080/?demo=html-simple-test"
        print(f"Navigating to {url_simple}")
        try:
            page.goto(url_simple, timeout=60000)
            page.wait_for_function("window.__DEMO_READY === true", timeout=20000)
            time.sleep(5)
            page.screenshot(path="verification/html-simple-test.png")
            print("Saved verification/html-simple-test.png")
        except Exception as e:
            print(f"Error capturing simple-test: {e}")

        # Test html-paradigm
        url_paradigm = "http://localhost:8080/?demo=html-paradigm"
        print(f"Navigating to {url_paradigm}")
        try:
            page.goto(url_paradigm, timeout=60000)
            page.wait_for_function("window.__DEMO_READY === true", timeout=20000)
            time.sleep(5)
            page.screenshot(path="verification/html-paradigm.png")
            print("Saved verification/html-paradigm.png")
        except Exception as e:
            print(f"Error capturing paradigm: {e}")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    capture_paradigm_screenshots()
