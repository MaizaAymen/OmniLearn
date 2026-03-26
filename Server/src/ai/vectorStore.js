import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
const chromaUrl = process.env.CHROMA_URL || "http://127.0.0.1:8000";
const chromaPersistDir = process.env.CHROMA_PERSIST_DIR || "./chroma_db";
const groqApiKey = process.env.GROQ_API_KEY;
const embeddings = new OpenAIEmbeddings({
  apiKey: groqApiKey,
});

export async function createVectorStore() {

  const vectorStore = await Chroma.fromTexts(
    [
      "React is a JavaScript library for building user interfaces",
      "Node.js allows JavaScript to run on servers",
      "MongoDB is a NoSQL database"
    ],
    [{ id: 1 }, { id: 2 }, { id: 3 }],
    embeddings,
    {
      collectionName: "demo",
      persistDirectory: chromaPersistDir,
      url: chromaUrl,
    }
  );

  return vectorStore;
}