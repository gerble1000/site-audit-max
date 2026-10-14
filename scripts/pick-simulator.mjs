#!/usr/bin/env node
/**
 * Picks the simulator runtime and device type used to photograph the app for the
 * App Store.
 *
 *   node scripts/pick-simulator.mjs runtime            [jsonFile]
 *   node scripts/pick-simulator.mjs devicetypes <family> [jsonFile]
 *
 * Without `jsonFile` the values are read from `xcrun simctl list`. Passing a file
 * instead makes the selection logic testable off a Mac, which is where this is
 * written.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Device names are ranked by preference. The iPad order deliberately prefers a
 * 12.9-inch model because its captures are 2048x2732, the size App Store Connect
 * already holds for this app's iPad slot; the 13-inch M4 (2064x2752) is also
 * accepted by Apple and is the first fallback.
 */
const PREFERENCE = {
  ipad: [
    '^iPad Pro \\(12\\.9-inch\\) \\(6th generation\\)$',
    '^iPad Pro \\(12\\.9-inch\\) \\(5th generation\\)$',
    '^iPad Pro 13-inch \\(M4\\)$',
    '^iPad Pro \\(12\\.9-inch\\)',
    '^iPad Pro 13-inch',
    '^iPad Pro',
  ],
  iphone: [
    '^iPhone 16 Pro Max$',
    '^iPhone 15 Pro Max$',
    '^iPhone 17 Pro Max$',
    '^iPhone 16 Plus$',
    '^iPhone 15 Plus$',
    '^iPhone 16$',
    '^iPhone 15$',
  ],
};

function load(args, subcommand, jsonFile) {
  if (jsonFile) return JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  return JSON.parse(execFileSync('xcrun', ['simctl', 'list', subcommand, '--json'], { maxBuffer: 32 * 1024 * 1024 }).toString());
}

/** Newest available iOS runtime identifier, or null. */
export function pickRuntime(runtimes) {
  const usable = (runtimes || []).filter(
    (r) => r.isAvailable && String(r.identifier).startsWith('com.apple.CoreSimulator.SimRuntime.iOS')
  );
  if (!usable.length) return null;
  usable.sort((a, b) => {
    const key = (v) => String(v).split('.').map((n) => parseInt(n, 10) || 0);
    const av = key(a.version);
    const bv = key(b.version);
    for (let i = 0; i < Math.max(av.length, bv.length); i++) {
      const d = (av[i] || 0) - (bv[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  });
  return usable[usable.length - 1].identifier;
}

/** Device type identifiers for a family, most preferred first. */
export function rankDeviceTypes(deviceTypes, family) {
  const order = PREFERENCE[family];
  if (!order) throw new Error(`Unknown family "${family}" (expected ipad or iphone)`);
  const rank = (name) => {
    for (let i = 0; i < order.length; i++) {
      if (new RegExp(order[i]).test(name)) return i;
    }
    return Number.MAX_SAFE_INTEGER;
  };
  return (deviceTypes || [])
    .map((t) => ({ id: t.identifier, name: t.name, r: rank(t.name) }))
    .filter((t) => t.r !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.r - b.r || a.name.localeCompare(b.name))
    .map((t) => t.id);
}

function main(argv) {
  const [command, family, jsonFile] = argv;

  if (command === 'runtime') {
    const runtime = pickRuntime(load(argv, 'runtimes', family).runtimes);
    if (!runtime) {
      console.error('No available iOS simulator runtime found.');
      process.exit(1);
    }
    process.stdout.write(runtime + '\n');
    return;
  }

  if (command === 'devicetypes') {
    if (!family) {
      console.error('Usage: pick-simulator.mjs devicetypes <ipad|iphone> [jsonFile]');
      process.exit(2);
    }
    const { devicetypes } = load(argv, 'devicetypes', jsonFile);
    const ranked = rankDeviceTypes(devicetypes, family);
    if (!ranked.length) {
      console.error(
        `No ${family} device type matched. Available: ` +
          (devicetypes || []).map((t) => t.name).join(', ')
      );
      process.exit(1);
    }
    process.stdout.write(ranked.join('\n') + '\n');
    return;
  }

  console.error('Usage: pick-simulator.mjs <runtime|devicetypes> [family] [jsonFile]');
  process.exit(2);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  main(process.argv.slice(2));
}
