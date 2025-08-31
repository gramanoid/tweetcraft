const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=================================');
console.log('BulkCraft Setup');
console.log('=================================\n');
console.log('To get your OpenRouter API key:');
console.log('1. Go to https://openrouter.ai');
console.log('2. Sign up or log in');
console.log('3. Go to Settings -> API Keys');
console.log('4. Create a new key\n');

rl.question('Enter your OpenRouter API key: ', (apiKey) => {
  if (!apiKey || apiKey.trim() === '') {
    console.log('\n❌ No API key provided. Setup cancelled.');
    rl.close();
    process.exit(1);
  }

  // Read current .env file
  let envContent = fs.readFileSync('.env', 'utf8');
  
  // Replace the placeholder
  envContent = envContent.replace(
    'OPENROUTER_API_KEY=your_openrouter_api_key_here',
    `OPENROUTER_API_KEY=${apiKey.trim()}`
  );
  
  // Write back
  fs.writeFileSync('.env', envContent);
  
  console.log('\n✅ API key saved to .env file!');
  console.log('\nYou can now test the connection with:');
  console.log('  node dist/cli/index.js test\n');
  console.log('Or generate content with:');
  console.log('  node dist/cli/index.js generate --topic "AI" --style confrontational\n');
  
  rl.close();
});