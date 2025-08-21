#!/usr/bin/env node
const fs = require('fs');

function die(msg, code=2){ console.error(msg); process.exit(code); }

const path = process.argv[2] || 'e2e/report/summary.json';
if (!fs.existsSync(path)) die(`[PROOF] Missing ${path}`);

const s = JSON.parse(fs.readFileSync(path,'utf8'));
const mode = s.mode;

// Time budget limits (prevents flakiness and performance regressions)
const timeBudgetLimits = {
  functional: 7 * 60 * 1000, // 7 minutes for functional tests
  live: 15 * 60 * 1000       // 15 minutes for live tests
};

const testDuration = s.metadata?.testDurationMs || 0;
const timeBudgetOk = testDuration <= timeBudgetLimits[mode];

// Strings integrity check (prevents cache bypass)
const stringsIntegrityOk = !s.metadata?.stringsHash || s.metadata?.stringsHashValid === true;

const gatesCommon = [
  ['consoleErrorsZero', s.consoleErrors === 0, `consoleErrors=${s.consoleErrors}`],
  ['ringBufferCap', (s.ringBuffer?.count ?? 999) <= 100, `ringBuffer.count=${s.ringBuffer?.count}`],
  ['noRawText', (s.ringBuffer?.rawTextLeak ?? 1) === 0, `ringBuffer.rawTextLeak=${s.ringBuffer?.rawTextLeak}`],
  ['timeBudgetOk', timeBudgetOk, `duration=${Math.round(testDuration/1000)}s, limit=${Math.round(timeBudgetLimits[mode]/1000)}s`],
  ['stringsIntegrityOk', stringsIntegrityOk, `stringsHash=${s.metadata?.stringsHash?.slice(0,8)}..., valid=${s.metadata?.stringsHashValid}`],
];

const gatesFunctional = mode === 'functional' ? [
  ['allControlsInteracted', s.gatesFunctional?.allControlsInteracted === true, JSON.stringify(s.uiCoverage)],
  ['noControlsMissingInRegistry', s.registry?.missingInRegistry === 0, `missingInRegistry=${s.registry?.missingInRegistry}`],
  ['keyboardParityAll', s.gatesFunctional?.keyboardParityAll === true, JSON.stringify(s.uiCoverage?.keyboard || {})],
  ['focusTrapsPassed', s.gatesFunctional?.focusTrapsPassed === true, JSON.stringify(s.uiCoverage?.keyboard || {})],
  ['clipboardTruth', s.gatesFunctional?.clipboardTruth === true, ''],
  ['antiCheatZero', s.antiCheat?.preventedClicks === 0, `preventedClicks=${s.antiCheat?.preventedClicks}`],
] : [];

const gatesLive = mode === 'live' ? [
  ['bootNoProviderCalls', s.gatesLive?.bootNoProviderCalls === true, JSON.stringify(s.budget || {})],
  ['researchOrderCorrect', s.gatesLive?.researchOrderCorrect === true, JSON.stringify(s.providerChronology || {})],
  ['generationOpenRouterOnly', s.gatesLive?.generationOpenRouterOnly === true, JSON.stringify(s.providerChronology || {})],
  ['budgetWithinLimits', s.gatesLive?.budgetWithinLimits === true, JSON.stringify(s.budget || {})],
  ['privacyOk', s.gatesLive?.privacyOk === true, JSON.stringify(s.ringBuffer || {})],
  ['resilienceOk', s.gatesLive?.resilienceOk === true, ''],
] : [];

// Validate schema consistency: both gate objects should always be present
if (!s.gatesFunctional || !s.gatesLive) {
  die(`[PROOF] Schema inconsistent: missing gate objects. gatesFunctional=${!!s.gatesFunctional}, gatesLive=${!!s.gatesLive}`);
}

const failures = [];
function check([key, pass, info]){ if (!pass) failures.push({key, info}); }

[...gatesCommon, ...gatesFunctional, ...gatesLive].forEach(check);

if (failures.length){
  console.error('[PROOF] FAILED gates:');
  for (const f of failures) console.error(` - ${f.key}: ${f.info}`);
  process.exit(3);
}

console.log(`[PROOF] OK — mode=${mode}; gates passed=${gatesCommon.length + gatesFunctional.length + gatesLive.length}`);