import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'jspdf': 'jspdf/dist/jspdf.es.min.js',
        },
    },
    optimizeDeps: {
        include: ['react-datepicker', 'jspdf'],
        force: true, // Forcer le pré-bundling
        esbuildOptions: {
            target: 'esnext',
            resolveExtensions: ['.js', '.jsx', '.mjs', '.cjs'],
        },
    },
});