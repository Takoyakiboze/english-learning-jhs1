const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([expo, { ignores: ['dist-ios/**', 'dist-web/**', 'dist-pages/**', 'test-results/**', 'artifacts/**', '--offline=false/**'] }]);
