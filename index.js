/**
 * Created by MaximeMaillet on 03/06/2017.
 */
'use strict';

var debug = require('debug');
var lServer = debug('ScrappyScrapper.index');


var engine = require('./engine');

/**
 * Method for check one config item
 * @param config
 * @returns {*}
 */
function checkConfig(config) {
	lServer("Start config checking");
	for(let i in config) {

		let cnf = Object.assign({
			'interval': 500,
			'oneShot': false
		}, config[i]);

		if(cnf.baseUrl === undefined) {
			throw new Error("Config failed : baseUrl is not defined")
		}

		if(cnf.worker === undefined) {
			throw new Error("Config failed : worker is not defined");
		}
		else {
			if(cnf.worker.scrapPattern === undefined) {
				throw new Error("Config failed (bad worker) : array scrapPattern is not defined");
			}

			if(!Array.isArray(cnf.worker.scrapPattern)) {
				throw new Error("Config failed (bad worker) : scrapPattern is not an array");
			}
			else {
				if(cnf.worker.scrapPattern.length === 0) {
					throw new Error("Config failed (bad worker) : scrapPattern is empty");
				}
			}

			if(cnf.worker.start === undefined) {
				throw new Error("Config failed (bad worker) : function start() is not defined");
			}

			if(cnf.worker.canScrapping === undefined) {
				throw new Error("Config failed (bad workker) : function canScrapping() is not defined");
			}
		}

		if(cnf.oneShot === undefined) {
			lServer("Config default : oneShot = false");
		}

		if(cnf.interval === undefined) {
			lServer("Config default : interval = 500");
		}

		config[i] = cnf;
	}

	lServer("End config checking : OK");
	return config;
}

/**
 * @param cnf
 */
module.exports = function(cnf) {
	let worker = require('./worker');
	let module = {
		'config': checkConfig(cnf),
	};

	/**
	 * Scrapper, which relaunch every hour
	 */
	module.start = function() {

		for(let i in module.config) {
			worker.start(module.config[i]);
		}

		if(!module.config.oneShot) {
			setInterval(() => {
				for(let i in module.config) {
					worker.start(module.config[i]);
				}
			}, 3600*1000);
		}
	};

	return module;
};