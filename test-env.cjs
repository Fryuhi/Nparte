const vite = require('vite');
const env = vite.loadEnv('development', '.', '');
console.log('GEMINI_API_KEY from loadEnv:', env.GEMINI_API_KEY);
