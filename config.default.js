/** LOCALIZE CONFIGURATION AND RENAME TO 'config.js' */

module.exports = {
  mongo: {
    db: 'fermentation_chamber',
    debug: true,
    host: 'localhost'
  },
  socket: {
    host: 'localhost',
    port: 1337,
    timeout: 5000
  }
};
