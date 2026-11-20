import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const { VITE_API_URL } = loadEnv(mode, process.cwd(), 'VITE_')
    let apiUrl: URL
    try {
      apiUrl = new URL(VITE_API_URL)
    } catch {
      throw new Error('Set VITE_API_URL to your backend HTTPS URL before building.')
    }
    if (apiUrl.protocol !== 'https:' || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
      throw new Error('VITE_API_URL must be an HTTPS URL without credentials, query, or fragment.')
    }
  }
  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the app directory
        '@': path.resolve(__dirname, './app'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
