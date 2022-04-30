const openapiGlue = require("fastify-openapi-glue");

const options = {
  specification: `${__dirname}/openApi.json`,
  service: `${__dirname}/service.js`
  // securityHandlers: `${__dirname}/security.js`,
};

module.exports = async function (fastify, opts) {
  fastify.register(openapiGlue, options);
};
