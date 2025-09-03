# API Key Configuration

## How to Configure the OpenRouter API Key

The OpenRouter API key is now hardcoded in the backend for simplicity. To configure it:

1. **Get your OpenRouter API key**:
   - Go to [openrouter.ai/keys](https://openrouter.ai/keys)
   - Create an account if needed
   - Generate a new API key

2. **Configure the API key in the extension**:
   - Open the file: `src/config/apiConfig.ts`
   - Replace `'sk-or-v1-YOUR_API_KEY_HERE'` with your actual API key:
   ```typescript
   export const API_CONFIG = {
     OPENROUTER_API_KEY: 'sk-or-v1-YOUR_ACTUAL_KEY_HERE', // Your real key
     // ... rest of config
   };
   ```

3. **Rebuild the extension**:
   ```bash
   npm run build
   ```

4. **Reload the extension in Chrome**:
   - Go to `chrome://extensions/`
   - Find TweetCraft
   - Click the refresh button

## Security Note

⚠️ **IMPORTANT**: Never commit your actual API key to a public repository. The `apiConfig.ts` file should be added to `.gitignore` if you plan to share the code publicly.

## Benefits of This Approach

- **Simpler setup**: No need to manually enter the API key in the popup
- **Consistent integration**: The API key is always available
- **No storage issues**: No need to deal with Chrome storage API for the key
- **Better for personal use**: Perfect for a personal extension

## Troubleshooting

If you see "API key not configured" messages:
1. Make sure you've replaced the placeholder key in `apiConfig.ts`
2. Rebuild the extension with `npm run build`
3. Reload the extension in Chrome
4. Check the browser console for any error messages