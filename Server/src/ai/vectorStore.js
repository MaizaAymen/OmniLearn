import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
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
    embeddings
  );

  return vectorStore;
}