const { QdrantClient } = require("@qdrant/js-client-rest");

class QdrantStore {
  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }

  async createCollection(name) {
    this._pendingName = name;
  }

  async addDocuments({ ids, embeddings, documents, collectionName }) {
    const name = collectionName || this._pendingName;
    const size = embeddings[0]?.length || 768;

    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === name);
    if (!exists) {
      await this.client.createCollection(name, {
        vectors: { size, distance: "Cosine" },
      });
    }

    await this.client.upsert(name, {
      wait: true,
      points: ids.map((id, i) => ({
        id: i + 1,
        vector: embeddings[i],
        payload: {
          text: documents[i].pageContent,
          metadata: documents[i].metadata,
        },
      })),
    });
  }

  async search({ embedding, limit, collectionName }) {
    const results = await this.client.search(collectionName, {
      vector: embedding,
      limit,
      with_payload: true,
    });

    return results.map((r) => ({
      id: r.id,
      text: r.payload.text,
      metadata: r.payload.metadata || {},
      score: r.score,
    }));
  }

  async deleteCollection(name) {
    await this.client.deleteCollection(name);
  }
}

module.exports = new QdrantStore();
