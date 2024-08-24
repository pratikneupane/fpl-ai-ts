import * as tf from '@tensorflow/tfjs-node';
import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';
import * as path from 'path';

export class Predictor {
  private db: Db;
  private model: tf.LayersModel | null = null;

  constructor(private mongoClient: MongoClient) {
    this.db = this.mongoClient.db();
  }

  async loadModel() {
    const modelPath = path.join(__dirname, '..', '..', 'models', 'fpl_predictor_model', 'model.json');
    this.model = await tf.loadLayersModel(`file://${modelPath}`);
    logger.info('Model loaded successfully');
  }

  async predictPlayerPoints(playerId: number, fixtureId: number) {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    const playerFeatures = await this.db.collection('player_features').findOne({ id: playerId });
    const fixtureFeatures = await this.db.collection('fixture_features').findOne({ id: fixtureId });

    if (!playerFeatures || !fixtureFeatures) {
      throw new Error('Player or fixture not found');
    }

    const input = tf.tensor2d([[
      playerFeatures.recentFormScore,
      playerFeatures.pricePerformanceRatio,
      playerFeatures.consistencyScore,
      playerFeatures.upcomingFixtureDifficulty,
      fixtureFeatures.homeTeamStrength,
      fixtureFeatures.awayTeamStrength,
      fixtureFeatures.strengthDifference,
      fixtureFeatures.expectedGoals
    ]]);

    const prediction = this.model.predict(input) as tf.Tensor;
    const predictedPoints = prediction.dataSync()[0];

    return predictedPoints;
  }

  async generateRecommendations(budget: number, limit: number = 5) {
    const players = await this.db.collection('processed_players').find().toArray();
    const fixtures = await this.db.collection('fixture_features').find().toArray();
    
    const recommendations = [];

    for (const player of players) {
      if (player.now_cost > budget) continue;

      let totalPredictedPoints = 0;
      for (const fixture of fixtures.slice(0, 5)) { // Predict for next 5 fixtures
        const predictedPoints = await this.predictPlayerPoints(player.id, fixture.id);
        totalPredictedPoints += predictedPoints;
      }

      const averagePredictedPoints = totalPredictedPoints / 5;

      recommendations.push({
        id: player.id,
        name: player.web_name,
        position: player.element_type,
        team: player.team,
        cost: player.now_cost,
        predictedPoints: averagePredictedPoints
      });
    }

    recommendations.sort((a, b) => b.predictedPoints - a.predictedPoints);
    return recommendations.slice(0, limit);
  }
}