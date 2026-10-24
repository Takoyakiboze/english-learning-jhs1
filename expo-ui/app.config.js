// Local development uses the domain root; Pages exports supply the repository path.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.PAGES_BASE_PATH || '',
  },
});
