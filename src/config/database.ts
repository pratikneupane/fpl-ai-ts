import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

/**
 * The MongoDB connection URI. If the `MONGODB_URI` environment variable is not set, it defaults to `'mongodb://localhost:27017/fpl_predictor'`.
 */
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/fpl_predictor";

/**
 * Connects to the MongoDB database using the configured MongoDB URI and returns the connected MongoDB client.
 * @returns {Promise<MongoClient>} A Promise that resolves to the connected MongoDB client.
 */
export const connectToDatabase = async (): Promise<MongoClient> => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client;
};
