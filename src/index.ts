import { connectToDatabase } from './config/database';
import { FPLDataCollector } from './data/dataCollector';
import { DataProcessor } from './data/dataProcessor';
import { FeatureEngineer } from './data/featureEngineer';
import { DatasetCreator } from './ml/datasetCreator';
import { ModelTrainer } from './ml/modelTrainer';
import { logger } from './utils/logger';

/**
 * The main entry point of the application. This function:
 * 1. Connects to the MongoDB database.
 * 2. Checks if the required data collections exist in the database.
 * 3. If the data does not exist, it fetches and processes the data.
 * 4. Creates a training dataset for the machine learning model.
 * 5. Trains the machine learning model.
 * 6. Disconnects from the MongoDB database.
 */
async function main() {
  try {
    const mongoClient = await connectToDatabase();
    logger.info('Connected to MongoDB');

    const db = mongoClient.db();

    // Check if data already exists
    const dataExists = await checkDataExists(db);

    if (!dataExists) {
      logger.info('Data does not exist. Fetching and processing data...');
      const collector = new FPLDataCollector(mongoClient);
      await collector.fetchAllData();

      const processor = new DataProcessor(mongoClient);
      await processor.processData();

      const featureEngineer = new FeatureEngineer(mongoClient);
      await featureEngineer.engineerFeatures();
    } else {
      logger.info('Data already exists. Skipping data collection and processing.');
    }

    const datasetCreator = new DatasetCreator(mongoClient);
    await datasetCreator.createTrainingDataset();

    const modelTrainer = new ModelTrainer(mongoClient);
    await modelTrainer.trainModel();

    await mongoClient.close();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('An error occurred:', error);
  }
}

/**
 * Checks if the required data collections exist in the database.
 * @param db - The MongoDB database instance.
 * @returns `true` if all required collections have at least one document, `false` otherwise.
 */
async function checkDataExists(db: any): Promise<boolean> {
  const collections = ['bootstrap_static', 'fixtures', 'player_summaries', 'processed_players', 'player_features', 'fixture_features'];
  for (const collection of collections) {
    const count = await db.collection(collection).countDocuments();
    if (count === 0) {
      return false;
    }
  }
  return true;
}

/**
 * Executes the main application logic.
 */
main();