const dbType = (process.env.VECTOR_DB || "chroma").toLowerCase();

let store;
switch (dbType) {
  case "qdrant":
    store = require("./qdrant");
    break;
  case "chroma":
  default:
    store = require("./chroma");
    break;
}

module.exports = store;
