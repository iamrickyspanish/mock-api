// const jwt = require("@fastify/jwt");

class Security {
  constructor() {}

  initialize(schemes) {
    console.log("Initialize:", JSON.stringify(schemes));
  }

  async BearerAuth(req, reply) {
    // if (typeof req.headers.Authorize === "string") {
    //   // const [_, token] = req.headers.Authorize.split("");
    //   request.jwtVerify();
    // }
    if (!req.jwtVerify()) throw new Error(401, "Unauthorized");
  }
}

module.exports = new Security();
