import { defineConfig } from 'rolldown';

const libName = 'attempt';

export default defineConfig(() => {
	return [
		// ['esm', 'js']
		['commonjs', 'js']
	].map(([format, fileExt]) => ({
		external: ['@riim/delay'],

		input: `src/${libName}.ts`,

		output: {
			file: `dist/${libName}.${fileExt}`,
			format,
			name: libName
		}
	}));
});
