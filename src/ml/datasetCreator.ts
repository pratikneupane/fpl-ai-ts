import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';

/**
 * The `DatasetCreator` class is responsible for creating a training dataset by combining player and fixture data from the database.
 *
 * The `createTrainingDataset` method retrieves player and fixture feature data from the database, combines them into a training dataset, and stores the dataset in the `training_dataset` collection.
 *
 * The `combinePlayerAndFixtureData` method is a private helper method that generates the training data by iterating over the player and fixture features and creating a combined data point for each combination.
 */
export class DatasetCreator {
  private db: Db;

  /**
   * Initializes the database connection for the `DatasetCreator` class.
   *
   * @param mongoClient - The MongoDB client instance used to connect to the database.
   */
  constructor(private mongoClient: MongoClient) {
      this.db = this.mongoClient.db();
  }

  /**
   * Creates a training dataset by combining player and fixture feature data from the database.
   *
   * This method retrieves the player and fixture feature data from the database, combines them into a training dataset, and stores the dataset in the `training_dataset` collection.
   *
   * @returns The generated training dataset.
   */
  async createTrainingDataset() {
    logger.info('Creating training dataset...');
    const playerFeaturesCollection = this.db.collection('player_features');
    const fixtureFeaturesCollection = this.db.collection('fixture_features');
    const trainingDatasetCollection = this.db.collection('training_dataset');

    const playerFeatures = await playerFeaturesCollection.find({}).toArray();
    const fixtureFeatures = await fixtureFeaturesCollection.find({}).toArray();

    const trainingData = this.combinePlayerAndFixtureData(playerFeatures, fixtureFeatures);

    await trainingDatasetCollection.deleteMany({});
    await trainingDatasetCollection.insertMany(trainingData);
    logger.info('Training dataset created and stored.');

    return trainingData;
  }

  /**
   * Combines player and fixture feature data to create a training dataset.
   *
   * This private helper method iterates over the player and fixture feature data, and generates a combined data point for each combination of player and fixture. The resulting training data points include various features extracted from the player and fixture data, as well as a placeholder for the target variable (actual points).
   *
   * @param playerFeatures - An array of player feature data objects.
   * @param fixtureFeatures - An array of fixture feature data objects.
   * @returns An array of training data points, where each data point is an object containing the combined player and fixture features.
   */
  private combinePlayerAndFixtureData(playerFeatures: any[], fixtureFeatures: any[]) {
    const trainingData = [];

    for (const player of playerFeatures) {
      for (const fixture of fixtureFeatures) {
        trainingData.push({
          playerId: player.id,
          fixtureId: fixture.id,
          recentFormScore: player.recentFormScore,
          pricePerformanceRatio: player.pricePerformanceRatio,
          consistencyScore: player.consistencyScore,
          upcomingFixtureDifficulty: player.upcomingFixtureDifficulty,
          homeTeamStrength: fixture.homeTeamStrength,
          awayTeamStrength: fixture.awayTeamStrength,
          strengthDifference: fixture.strengthDifference,
          expectedGoals: fixture.expectedGoals,
          // Add more features as needed
          // Target variable (you may need to adjust this based on your actual data)
          actualPoints: Math.random() * 20 // This is a placeholder, replace with actual points data
        });
      }
    }

    return trainingData;
  }
}