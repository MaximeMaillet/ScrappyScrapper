'use strict';

const xmlParser = require('xml2js');
const hh = require('http-https');

/**
 * @deprecated
 * @type {"path"}
 */
const path = require('path');

let customScrapSite, baseUrl;

/**
 * Entrypoint : url html : http://jdjdjd
 * Scrap entrypoint
 * 	find urls html with pattern
 * 		push
 * Scrap sitemap
 * 	recursive to find html
 * 		find url with pattern
 * 			push
 *
 */

const {promisify} = require('util');

const cbZlib = require('zlib');
const contentType = require('content-type');
const urlParser = require('url');
const engine = require('./engine');
const debug = require('debug');

const lWorker = debug('ScrappyScrapper:engine:debug');
const lError = debug('ScrappyScrapper:engine:error');
const urlToScrap = [];
let tooManyRequestMode = false;

/**
 * Entry point of worker
 * @param config
 */
module.exports.start = (config) => {

	lWorker('Start engine');
	customScrapSite = config.worker;
	const { baseUrl } = config;

	urlToScrap.push(baseUrl);
	urlToScrap.push(`${baseUrl}/sitemap.xml`);

	setInterval(() => {
		scrapArrayUrl();
	}, config.interval);
};

/**
 * List url for scrapped
 */
function scrapArrayUrl() {

	if(tooManyRequestMode) {
		setInterval(() => {
			tooManyRequestMode = false;
		}, 5000);
	}

	if(urlToScrap.length > 0 && !tooManyRequestMode) {
		for(let i=0; i<100 && i<urlToScrap.length; i++) {
			getUrl(urlToScrap[i]);
			urlToScrap.splice(i, 1);
		}
	}
}

/**
 * send GET request to url
 * @param url
 */
function getUrl(url) {

	const urlParsed = urlParser.parse(url);

	if (urlParsed.hostname === null) {
		lError('Url whitout hostname : %s', url);
		return;
	}

	if (urlParsed.protocol !== 'http:' && urlParsed.protocol !== 'https:') {
		lError('Bad protocol : %s', urlParsed.protocol);
		return;
	}

	const req = hh.request(url, (res) => {
		if (res.statusCode >= 300 && res.statusCode < 400) {
			return getUrl(res.headers.location);
		} else if(res.statusCode === 429) {
			tooManyRequestMode = true;
		} else if (res.statusCode >= 200 && res.statusCode < 300) {

			const contentTypeUrl = contentType.parse(res.headers['content-type']);
			const chunks = [];

			const out = function(buffer) {
				if(contentTypeUrl.type === 'application/xml') {
					scrapXmlData(buffer.toString());
				} else if(contentTypeUrl.type === 'application/octet-stream') {
					decompressGzFromBuffer(buffer);
				} else if(contentTypeUrl.type === 'text/html') {
					scrapFromBody(url, buffer.toString());
				}
			};

			res.on('data', (chunk) => {
				chunks.push(chunk);
			});

			res.on('end', () => {
				const buffer = Buffer.concat(chunks);
				out(buffer);
			});
		} else {
			lError('Status not accepted (%s) : %s', res.statusCode, url);
			urlToScrap.push(url);
		}
	});

	req.on('error', (e) => {
		urlToScrap.push(url);
		lError('Problem with url : %s, Request: %s', url, e.message);
	});

	req.end();
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

/**
 * Start scrapping from body
 * @param url
 * @param body
 */
async function scrapFromBody(url, body) {

	try {
		let $ = await engine.transform(body);
		scrapLinks($);
		await correspondToPattern(url);
		await customScrapSite.canScrapping(url);
		lWorker('Launch scrapping %s', url);
		customScrapSite.start(url, $);

		$ = null;

	} catch(e) {
		lError(e);
	}
}

/**
 * Start scrapping from url
 * @param url
 */
async function scrapFromUrl(url) {

	try {
		let $ = await engine.scrap(url);
		scrapLinks($);
		await correspondToPattern(url);
		await customScrapSite.canScrapping(url);

		lWorker('Launch scrapping %s', url);
		customScrapSite.start(url, $);

		$ = null;

	} catch(e) {
		console.error(e);
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
 * Scrap page for found link
 * @param $
 */
function scrapLinks($) {
	$('a').each(function() {
		const urlDomain = formatUrl($(this).attr('href'));
		urlToScrap.push(urlDomain.url);
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