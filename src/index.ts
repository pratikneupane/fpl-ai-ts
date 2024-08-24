import { connectToDatabase } from "./config/database";
import { FPLDataCollector } from "./data/dataCollector";
import { DataProcessor } from "./data/dataProcessor";
import { FeatureEngineer } from "./data/featureEngineer";
import { DatasetCreator } from "./ml/datasetCreator";
import { ModelTrainer } from "./ml/modelTrainer";
import { Predictor } from "./ml/predictor";
import { logger } from "./utils/logger";

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
    logger.info("Connected to MongoDB");

    const collector = new FPLDataCollector(mongoClient);
    await collector.fetchAllData();

    const processor = new DataProcessor(mongoClient);
    await processor.processData();

    const featureEngineer = new FeatureEngineer(mongoClient);
    await featureEngineer.engineerFeatures();

    //   const datasetCreator = new DatasetCreator(mongoClient);
    //   await datasetCreator.createTrainingDataset();

    //   const modelTrainer = new ModelTrainer(mongoClient);
    //   await modelTrainer.trainModel();

    //   const predictor = new Predictor(mongoClient);
    //   await predictor.loadModel();

    //   // Example usage
    //   const playerPrediction = await predictor.predictPlayerPoints(1, 1); // Replace with actual player and fixture IDs
    //   logger.info(`Predicted points for player: ${playerPrediction}`);

    //   const recommendations = await predictor.generateRecommendations(100, 5); // 100 is the budget, 5 is the number of recommendations
    //   logger.info("Transfer recommendations:", recommendations);

    await mongoClient.close();
    logger.info("Disconnected from MongoDB");
  } catch (error) {
    logger.error("An error occurred:", error);
  }
}

/**
 * Executes the main application logic.
 */
main();
