
const ScrappyServer = require('../index')([
  {
    interval: 500,
    baseUrl: 'https://www.songkick.com',
    worker: null,
    oneShot: true,
    ip_change: {
      os: 'osx',
      card: 'en0',
      current: 'LaGargouille',
      ips: [
        {'SSID': 'aux3maries_EXT', 'PASSWD':'aux3maries'},
        {'SSID': 'LaGargouille', 'PASSWD':'La_Gargouille{14}'}
      ]
    }
  }
]);

ScrappyServer.start();