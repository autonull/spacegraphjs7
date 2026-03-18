from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5174/demo/index.html")
        page.wait_for_timeout(3000)
        page.screenshot(path="verification.png")
        browser.close()

if __name__ == '__main__':
    run()
