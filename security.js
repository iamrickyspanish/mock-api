// implementation of the security schemes in the openapi specification

class Security {
  constructor() {}

  initialize(schemes){
    // schemes will contain securitySchemes as found in the openapi specification
    console.log("Initialize:", JSON.stringify(schemes));
  }


}

module.exports = new Security();
