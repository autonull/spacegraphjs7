#!/bin/bash
set -e

echo "Running fresh install test..."

# Create a clean test directory
rm -rf /tmp/sg-test
mkdir /tmp/sg-test
cd /tmp/sg-test

# Initialize a new npm project
npm init -y > /dev/null

# Create a mock three.js to satisfy peer dependency quickly for the test,
# or install it real quick.
echo "Installing dependencies..."
npm install three > /dev/null
npm install file:/app > /dev/null

echo "Creating test file..."
cat > test.mjs << 'EOF'
import { SpaceGraph } from 'spacegraphjs';
import { spacegraphVision } from 'spacegraphjs/vision';
import { visionAssert } from 'spacegraphjs/vision-test';

console.log('SpaceGraph import successful:', typeof SpaceGraph);
console.log('Vision import successful:', typeof spacegraphVision);
console.log('Vision Test import successful:', typeof visionAssert);

if (typeof SpaceGraph !== 'function') throw new Error('SpaceGraph missing');
if (typeof spacegraphVision !== 'function') throw new Error('spacegraphVision missing');
if (typeof visionAssert !== 'object') throw new Error('visionAssert missing');
EOF

echo "Testing imports in Node..."
node test.mjs

echo "✅ Fresh install test passed!"
