const openapiGlue = require("fastify-openapi-glue");
const jwt = require("@fastify/jwt");

const openApiOptions = {
  specification: `${__dirname}/openApi.json`,
  service: `${__dirname}/service.js`,
  securityHandlers: `${__dirname}/security.js`
};

const jwtOptions = {
  secret: "not a secret at all"
};

module.exports = async function (fastify, opts) {
  fastify.register(openapiGlue, openApiOptions);
  fastify.register(jwt, jwtOptions);
};
