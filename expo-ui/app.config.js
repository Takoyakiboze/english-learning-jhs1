// Local development uses the domain root; Pages exports supply the repository path.
const { version } = require('./package.json');

module.exports = ({ config }) => ({
  ...config,
  version,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.PAGES_BASE_PATH || '',
  },
});
