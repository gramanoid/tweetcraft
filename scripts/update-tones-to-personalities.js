// Script to update all references from Tones to Personalities in the codebase
// This script helps identify all files that need updating

const replacements = [
  // Variable names
  { from: 'selectedTone', to: 'selectedPersonality' },
  { from: 'favoriteTones', to: 'favoritePersonalities' },
  { from: 'toneId', to: 'personalityId' },
  { from: 'tone.id', to: 'personality.id' },
  { from: 'tone.emoji', to: 'personality.emoji' },
  { from: 'tone.label', to: 'personality.label' },
  { from: 'tone.description', to: 'personality.description' },
  { from: 'tone.systemPrompt', to: 'personality.systemPrompt' },
  
  // Data attributes
  { from: 'data-tone', to: 'data-personality' },
  { from: 'data-tone-star', to: 'data-personality-star' },
  
  // CSS classes
  { from: 'tone-btn', to: 'personality-btn' },
  { from: 'tone-grid', to: 'personality-grid' },
  { from: 'tone-emoji', to: 'personality-emoji' },
  { from: 'tone-label', to: 'personality-label' },
  { from: 'selected-tone', to: 'selected-personality' },
  { from: 'tones-section', to: 'personalities-section' },
  
  // Constants
  { from: 'TONES', to: 'PERSONALITIES' },
  { from: 'getTone', to: 'getPersonality' },
  
  // Type names
  { from: 'Tone[]', to: 'Personality[]' },
  { from: ': Tone', to: ': Personality' },
  { from: '<Tone>', to: '<Personality>' },
  
  // Function parameters
  { from: 'tones:', to: 'personalities:' },
  { from: 'tone:', to: 'personality:' },
];

console.log('Replacements to make:');
replacements.forEach(r => {
  console.log(`  "${r.from}" -> "${r.to}"`);
});

console.log('\nFiles to update:');
console.log('  - src/content/unifiedSelector.ts');
console.log('  - src/content/contentScript.ts');
console.log('  - src/services/templateSuggester.ts');
console.log('  - src/services/arsenalService.ts');
console.log('  - src/content/toneSelector.ts (rename to personalitySelector.ts)');
console.log('  - CSS files with tone classes');