// const jwt = require("@fastify/jwt");

class Security {
  constructor() {}

  initialize(schemes) {
    console.log("Initialize:", JSON.stringify(schemes));
  }

  async BearerAuth(req, reply) {
    try {
      if (typeof req.headers.authorization === "string") {
        req.jwtVerify();
      } else throw new Error();
    } catch (e) {
      throw new Error(401, "Unauthorized");
    }
  }
}

module.exports = new Security();
