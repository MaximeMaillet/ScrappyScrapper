'use strict';

const xmlParser = require('xml2js');
let customScrapSite, baseUrl;

const cbZlib = require('zlib');
const debug = require('debug');

const lWorker = debug('ScrappyScrapper:engine:debug');
const urlToScrap = [];






const {body: scrapBody} = require('./scrap');
const {send} = require('./request');

let workerInterval = null;
let tooManyRequestMode = false;

/**
 * Entry point of worker, which only scrap
 * {
 *   baseUrl: 'https://www.songkick.com',
 * }
 * @param config
 */
module.exports.start = async(config) => {
	lWorker('Start engine');
	const { entrypoint } = config;
	baseUrl = config.baseUrl;
  customScrapSite = config.worker;

  try {
    const $ = await send(entrypoint);
    findLinks($);

    workerInterval = setInterval(() => {
      scrapAll();
    }, 500);

    const garbage = setInterval(() => {
      if(urlToScrap.length === 0) {
        console.log('End scrapping');
        clearInterval(workerInterval);
        clearInterval(garbage);
      }
    }, 10000);

  } catch(err) {
    console.log(`Fail entrypoint ${err.message}`);
  }
};

/**
 * Find all links into body
 * @param $
 * @return {Promise.<void>}
 */
async function findLinks($) {
  $('a').each(function() {
    const urlDomain = formatUrl($(this).attr('href'));
    urlToScrap.push(urlDomain.url);
  });
}

/**
 * List all Url to scrap and launch new promise for execute scrap for one url
 * @return {Promise.<void>}
 */
async function scrapAll() {
  if(tooManyRequestMode) {
    setInterval(() => {
      tooManyRequestMode = false;
    }, 10000);
  }

  if(!tooManyRequestMode && urlToScrap.length > 0) {
    for(let i=0; i<100 && i<urlToScrap.length; i++) {
      scrapUrl(urlToScrap[i]);
      urlToScrap.splice(i, 1);
    }
  }
}

/**
 * Scrap one url
 * @param url
 * @return {Promise.<void>}
 */
async function scrapUrl(url) {
  try {
    const $ = await send(url);
    await correspondToPattern(url);
    console.log(`Launch scrapping ${url}`);
    customScrapSite.start(url, $);
  } catch(err) {
    console.log(`Fail for ${url} : ${err.message}`);
  }
}

/**
 * Get custom pattern for check url
 * @param url
 * @returns {Promise}
 */
function correspondToPattern(url) {
  return new Promise((resolve, reject) => {
    const urlDomain = formatUrl(url);
    if(urlDomain !== null) {
      customScrapSite.scrapPattern.forEach((pattern) => {
        if(pattern.exec(urlDomain.endpoint) !== null) {
          resolve();
        }
      });
    }

    reject('Url does not corresponding to custom pattern : %s', url);
  });
}

/**
 * Format URL for return domain + endpoint
 * @param url
 * @returns {*}
 */
function formatUrl(url) {
  const domainRegex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)(.+)/im;
  const matches = domainRegex.exec(url);
  if(matches === null) {
    return {url: baseUrl+url, endpoint: url};
  }
  else {
    return {url: matches[0], endpoint: matches[2]};
  }
}




/**
 * Scrap xml data
 * @param xml
 */
function scrapXmlData(xml) {
	const parseString = xmlParser.parseString;
	parseString(xml, (err, result) => {
		if(err) {
			return false;
		}

		if(result.sitemapindex !== undefined) {
			result.sitemapindex.sitemap.forEach((sitemap) => {
				urlToScrap.push(sitemap.loc[0]);
			});
		}

		if(result.urlset !== undefined) {
			result.urlset.url.forEach((sitemap) => {
				urlToScrap.push(sitemap.loc[0]);
			});
		}

		result = null;
		xml = null;
	});
}

/**
 * Decompress buffer
 * @param buffer
 */
function decompressGzFromBuffer(buffer) {
	cbZlib.unzip(buffer, (err, data) => {
		scrapXmlData(data.toString());
	});
}



