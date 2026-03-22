# Troubleshooting

## Demo shows blank screen

1. Check browser console (F12) for errors
2. Verify Three.js loaded: `console.log(typeof THREE)` → should be "object"
3. Check container has size: `document.getElementById('container').clientWidth` → should be > 0
4. Verify WebGL support: https://get.webgl.org/

## Camera controls don't work

1. Click directly on the canvas (not outside)
2. Check browser console for errors
3. Try a different browser

## npm install fails

1. Delete node_modules: `rm -rf node_modules`
2. Delete package-lock.json: `rm package-lock.json`
3. Reinstall: `npm install`

## TypeScript errors

1. Check TypeScript version: `npx tsc --version`
2. Should be 5.x.x
3. Run: `npm install` to get correct versions
