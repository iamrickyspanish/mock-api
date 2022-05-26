const openapiGlue = require("fastify-openapi-glue");
const jwt = require("@fastify/jwt");
// const jwtBlacklist = require("./jwtBlacklist");

const openApiOptions = {
  specification: `${__dirname}/openApi.json`,
  service: `${__dirname}/service.js`,
  securityHandlers: `${__dirname}/security.js`
};

// const validateToken = (request, decodedToken) => {
//   !jwtBlacklist.includes(decodedToken.jti);
// };

const jwtOptions = {
  secret: "not a secret at all"
  // trusted: validateToken
};

module.exports = async function (fastify, opts) {
  fastify.register(openapiGlue, openApiOptions);
  fastify.register(jwt, jwtOptions);
  fastify.setErrorHandler((err, req, reply) => {
    const isInitializationRejected =
      req.url.includes("initialize_application") && err.statusCode === 401;

    const error = isInitializationRejected
      ? null
      : err.statusCode === 401
      ? { error: "" }
      : {
          status: err.statusCode,
          message: err.message,
          errors: []
        };

    const code = isInitializationRejected ? 302 : err.statusCode;

    const headers = isInitializationRejected
      ? {
          Location: "http://app.hrlab.de/de/auth/login/"
        }
      : {};

    reply.code(code).headers(headers).send(error);
  });
};
