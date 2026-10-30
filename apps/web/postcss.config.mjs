import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Point explicitly to the monorepo root node_modules
const rootNodeModules = path.resolve(__dirname, '../../node_modules');

const config = {
  plugins: {
    [path.join(rootNodeModules, 'tailwindcss')]: {},
    [path.join(rootNodeModules, 'autoprefixer')]: {},
  },
};

export default config;
