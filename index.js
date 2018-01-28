'use strict';

const debug = require('debug');
const lServer = debug('ScrappyScrapper:index');
let config = [];

/**
 * @param cnf
 */
module.exports.init = (cnf) => {
  config = checkConfig(cnf);

  return module.exports;
};

module.exports.start = () => {
  const worker = require('./src/worker');
  for(const i in config) {

    worker.start(config[i]);

    if (!config[i].oneShot) {
      setInterval(() => {
          worker.start(config[i]);
      }, config[i].interval);
    }
  }
};

/**
 * Method for check one config item
 * @param config
 * @returns {*}
 */
function checkConfig(config) {
  lServer('Start config checking');
  for (const i in config) {

    const cnf = Object.assign({
      'interval': 500,
      'oneShot': false
    }, config[i]);

    if (cnf.baseUrl === undefined) {
      throw new Error('Config failed : baseUrl is not defined');
    }

    if (cnf.worker === undefined) {
      throw new Error('Config failed : worker is not defined');
    }
    else {
      if (cnf.worker.start === undefined) {
        throw new Error('Config failed (bad worker) : function start() is not defined');
      }
    }

    if (cnf.oneShot === undefined) {
      lServer('Config default : oneShot = false');
    }

    if (cnf.interval === undefined) {
      lServer('Config default : interval = 500');
    }

    config[i] = cnf;
  }

  lServer('End config checking : OK');
  return config;
}