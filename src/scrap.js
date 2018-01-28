const engine = require('./engine');
const validate = require('./validate');

// @TODO

module.exports = {
  body,
};

function xml() {

}

async function body(content) {
  try {
    return await engine.transform(content);
  } catch(e) {
    console.log(e);
  }
}