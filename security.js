// const jwt = require("@fastify/jwt");
const jwtBlacklist = require("./jwtBlacklist");

class Security {
  constructor() {}

  initialize(schemes) {
    console.log("Initialize:", JSON.stringify(schemes));
  }

  async BearerAuth(req, reply) {
    try {
      const [_, token] = req.headers.authorization?.split(" ");
      if (token && !jwtBlacklist.includes(token)) {
        req.jwtVerify();
      } else throw new Error();
    } catch (e) {
      throw new Error(401, "Unauthorized");
    }
  }
}

module.exports = new Security();
