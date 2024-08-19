import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';
import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Provides functionality for training a machine learning model for predicting fantasy football points.
 * The `ModelTrainer` class is responsible for loading training data from a MongoDB database, preparing the data,
 * creating and training a TensorFlow.js model, and saving the trained model to disk.
 */
export class ModelTrainer {
  private db: Db;

  /**
   * Initializes the database connection for the `ModelTrainer` class.
   * @param mongoClient - The MongoDB client instance used to connect to the database.
   */
  constructor(private mongoClient: MongoClient) {
    this.db = this.mongoClient.db();
  }

  /**
   * Trains a machine learning model for predicting fantasy football points.
   * This method loads the training data from a MongoDB database, prepares the data,
   * creates and trains a TensorFlow.js model, and saves the trained model to disk.
   */
  async trainModel() {
    logger.info('Training model...');
    const trainingDatasetCollection = this.db.collection('training_dataset');
    const trainingData = await trainingDatasetCollection.find({}).toArray();

    const { inputs, labels } = this.prepareData(trainingData);

    const model = this.createModel();
    await this.fitModel(model, inputs, labels);

    await this.saveModel(model);
    logger.info('Model trained and saved.');
  }

  /**
   * Prepares the training data by extracting the input features and labels from the provided data.
   * The input features are extracted from each data item and stored in a 2D tensor. The labels are
   * extracted from each data item and stored in a 1D tensor.
   *
   * @param data - An array of data items containing the input features and labels.
   * @returns An object containing the input features and labels as TensorFlow.js tensors.
   */
  private prepareData(data: any[]) {
    const inputs = data.map(item => [
      item.recentFormScore,
      item.pricePerformanceRatio,
      item.consistencyScore,
      item.upcomingFixtureDifficulty,
      item.homeTeamStrength,
      item.awayTeamStrength,
      item.strengthDifference,
      item.expectedGoals
    ]);

    /**
     * Extracts the actual fantasy football points for each data item in the provided array.
     * @param data - An array of data items containing input features and actual fantasy football points.
     * @returns A 1D tensor containing the actual fantasy football points for each data item.
     */
    const labels = data.map(item => item.actualPoints);

    return {
      inputs: tf.tensor2d(inputs),
      labels: tf.tensor1d(labels)
    };
  }

  /**
   * Creates a TensorFlow.js sequential model for predicting fantasy football points.
   * The model has three dense layers:
   * - The first layer has 64 units and a ReLU activation function. It takes an input shape of 8 features.
   * - The second layer has 32 units and a ReLU activation function.
   * - The final layer has 1 unit (for the predicted fantasy points).
   * The model is compiled with the Adam optimizer and mean squared error loss function, and the mean absolute error metric is used.
   *
   * @returns A compiled TensorFlow.js sequential model.
   */
  private createModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [8] }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({
      optimizer: tf.train.adam(),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  /**
   * Trains the provided TensorFlow.js sequential model using the given input features and labels.
   * The model is trained for 5 epochs, with 20% of the data used for validation. The loss and mean absolute error are logged at the end of each epoch.
   *
   * @param model - The TensorFlow.js sequential model to be trained.
   * @param inputs - A 2D tensor containing the input features for the model.
   * @param labels - A 1D tensor containing the actual fantasy football points for each data item.
   * @returns A Promise that resolves when the model training is complete.
   */
  private async fitModel(model: tf.Sequential, inputs: tf.Tensor, labels: tf.Tensor) {
    await model.fit(inputs, labels, {
      epochs: 5,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          logger.info(`Epoch ${epoch}: loss = ${logs?.loss}, mae = ${logs?.mae}`);
        }
      }
    });
  }

  /**
   * Saves the provided TensorFlow.js sequential model to a local directory.
   * The directory is created if it does not already exist.
   *
   * @param model - The TensorFlow.js sequential model to be saved.
   */
  private async saveModel(model: tf.Sequential) {
    const modelDir = path.join(__dirname, '..', '..', 'models');
    this.ensureDirectoryExistence(modelDir);
    const saveResult = await model.save(`file://${modelDir}/fpl_predictor_model`);
    logger.info(`Model saved: ${saveResult}`);
  }

  /**
   * Ensures that the specified directory path exists. If the directory does not exist, it is created recursively.
   *
   * @param dirPath - The path of the directory to ensure exists.
   */
  private ensureDirectoryExistence(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    }
  }
}