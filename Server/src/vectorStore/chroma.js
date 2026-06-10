const { ChromaClient } = require("chromadb");

class ChromaStore {
  constructor() {
    const url = process.env.CHROMA_URL || "http://localhost:8000";
    this.client = new ChromaClient({ path: url });
  }

  async createCollection(name) {
    await this.client.getOrCreateCollection({ name });
  }

  async addDocuments({ ids, embeddings, documents, collectionName }) {
    const col = await this.client.getOrCreateCollection({
      name: collectionName,
    });
    await col.add({
      ids,
      embeddings,
      metadatas: documents.map((d) => d.metadata),
      documents: documents.map((d) => d.pageContent),
    });
  }

  async search({ embedding, limit, collectionName }) {
    const col = await this.client.getOrCreateCollection({
      name: collectionName,
    });
    const results = await col.query({
      queryEmbeddings: [embedding],
      nResults: limit,
      include: ["metadatas", "documents", "distances"],
    });

    const items = [];
    for (let i = 0; i < (results.ids[0] || []).length; i++) {
      items.push({
        id: results.ids[0][i],
        text: results.documents[0][i],
        metadata: results.metadatas[0][i] || {},
        score: results.distances[0][i],
      });
    }
    return items;
  }

  async deleteCollection(name) {
    await this.client.deleteCollection({ name });
  }
}

module.exports = new ChromaStore();
