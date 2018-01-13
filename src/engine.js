let rp = require('request-promise');
let cheerio = require('cheerio'); // Basically jQuery for node.js

module.exports = {
	url: null,
	send: function() {
		let options = {
			uri: this.url,
			transform: this.transform(body)
		};
		return rp(options);
	},
	scrap: function(url) {
		this.url = url;
		return this.send();
	},
	transform: function(body) {
		return cheerio.load(body);
	}
};