const hh = require('http-https');
const Url = require('url');
const rp = require('request-promise');
const cheerio = require('cheerio');

module.exports = {
  send,
};

async function send(url) {
  const options = {
    uri: url,
    transform: (body) => {
      return cheerio.load(body);
    }
  };

  return rp(options)
    .catch((err) => {
      console.log(err.message);
      throw err;
    });
}