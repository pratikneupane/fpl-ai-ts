import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';

/**
 * The FeatureEngineer class is responsible for engineering and storing various features related to players and fixtures in a MongoDB database.
 *
 * The class has the following main responsibilities:
 * - Creating and storing player features, such as recent form, price-performance ratio, consistency, and upcoming fixture difficulty.
 * - Creating and storing fixture features, such as home and away team strength, strength difference, and expected goals.
 *
 * The class uses the MongoDB client to interact with the database and perform the necessary operations.
 */
export class FeatureEngineer {
  private db: Db;

  /**
   * Initializes the FeatureEngineer class with a MongoDB client and database connection.
   *
   * @param mongoClient - The MongoDB client instance used to connect to the database.
   */
  constructor(private mongoClient: MongoClient) {
      this.db = this.mongoClient.db();
  }

  /**
   * Engineers and stores player and fixture features in a MongoDB database.
   *
   * This method calls the `createPlayerFeatures()` and `createFixtureFeatures()` methods
   * to generate and store the respective feature data in the database.
   */
  async engineerFeatures() {
      await this.createPlayerFeatures();
      await this.createFixtureFeatures();
  }

  /**
   * Engineers and stores player features in a MongoDB database.
   *
   * This method retrieves all processed player data from the 'processed_players' collection,
   * calculates various player features such as recent form, price-performance ratio, consistency,
   * and upcoming fixture difficulty, and stores the engineered features in the 'player_features'
   * collection.
   *
   * The engineered features include:
   * - `recentFormScore`: The average of the player's last 5 game points.
   * - `pricePerformanceRatio`: The ratio of the player's total points to their current cost.
   * - `consistencyScore`: The standard deviation of the player's game points.
   * - `upcomingFixtureDifficulty`: The average strength of the player's upcoming fixtures.
   *
   * This method is called by the `engineerFeatures()` method to handle the engineering and
   * storage of player features.
   */
  private async createPlayerFeatures() {
    logger.info('Engineering player features...');
    const processedPlayerCollection = this.db.collection('processed_players');
    const featureCollection = this.db.collection('player_features');

    const players = await processedPlayerCollection.find({}).toArray();

    const playerFeatures = players.map(player => {
      return {
        id: player.id,
        recentFormScore: this.calculateRecentForm(player.history),
        pricePerformanceRatio: player.totalPoints / (player.now_cost || 1),
        consistencyScore: this.calculateConsistency(player.history),
        upcomingFixtureDifficulty: this.calculateUpcomingFixtureDifficulty(player.fixtures),
        // Add more engineered features as needed
      };
    });

    await featureCollection.deleteMany({});
    await featureCollection.insertMany(playerFeatures);
    logger.info('Player features engineered and stored.');
  }

  /**
   * Engineers and stores fixture features in a MongoDB database.
   *
   * This method retrieves all processed fixture data from the 'processed_fixtures' collection,
   * calculates various fixture features such as expected goals, team strength difference, and
   * stores the engineered features in the 'fixture_features' collection.
   *
   * The engineered features include:
   * - `homeTeamStrength`: The strength of the home team.
   * - `awayTeamStrength`: The strength of the away team.
   * - `strengthDifference`: The difference in strength between the home and away teams.
   * - `expectedGoals`: The expected goals for the fixture based on the team strengths.
   *
   * This method is called by the `engineerFeatures()` method to handle the engineering and
   * storage of fixture features.
   */
  private async createFixtureFeatures() {
    logger.info('Engineering fixture features...');
    const processedFixtureCollection = this.db.collection('processed_fixtures');
    const processedTeamCollection = this.db.collection('processed_teams');
    const featureCollection = this.db.collection('fixture_features');

    const fixtures = await processedFixtureCollection.find({}).toArray();
    const teams = await processedTeamCollection.find({}).toArray();

    const fixtureFeatures = await Promise.all(fixtures.map(async fixture => {
      const homeTeam = teams.find(team => team.id === fixture.teamH);
      const awayTeam = teams.find(team => team.id === fixture.teamA);

      return {
        id: fixture.id,
        event: fixture.event,
        homeTeamStrength: homeTeam?.strength || 0,
        awayTeamStrength: awayTeam?.strength || 0,
        strengthDifference: (homeTeam?.strength || 0) - (awayTeam?.strength || 0),
        expectedGoals: this.calculateExpectedGoals(homeTeam, awayTeam),
        // Add more engineered features as needed
      };
    }));

    await featureCollection.deleteMany({});
    await featureCollection.insertMany(fixtureFeatures);
    logger.info('Fixture features engineered and stored.');
  }

  /**
   * Calculates the recent form of a player based on their last 5 games.
   *
   * @param history - An array of game data objects for the player.
   * @returns The average total points scored by the player in their last 5 games.
   */
  private calculateRecentForm(history: any[] | undefined): number {
    if (!history || history.length === 0) {
      return 0;
    }
    const recentGames = history.slice(-5);
    return recentGames.reduce((sum, game) => sum + (game.total_points || 0), 0) / recentGames.length;
  }

  /**
   * Calculates the consistency of a player's performance based on their game history.
   *
   * @param history - An array of game data objects for the player.
   * @returns The standard deviation of the player's total points scored in their game history.
   */
  private calculateConsistency(history: any[] | undefined): number {
    if (!history || history.length === 0) {
      return 0;
    }
    const points = history.map(game => game.total_points || 0);
    const mean = points.reduce((sum, points) => sum + points, 0) / points.length;
    const squaredDiffs = points.map(points => Math.pow(points - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / points.length);
  }

  /**
   * Calculates the average difficulty of the next 5 upcoming fixtures.
   *
   * @param fixtures - An array of fixture objects.
   * @returns The average difficulty of the next 5 upcoming fixtures.
   */
  private calculateUpcomingFixtureDifficulty(fixtures: any[] | undefined): number {
    if (!fixtures || fixtures.length === 0) {
      return 0;
    }
    return fixtures.slice(0, 5).reduce((sum, fixture) => sum + (fixture.difficulty || 0), 0) / 5;
  }

  /**
   * Calculates the expected goals for a match based on the attacking strength of the home team and the defensive strength of the away team.
   *
   * @param homeTeam - An object representing the home team, with a `strengthAttack` property.
   * @param awayTeam - An object representing the away team, with a `strengthDefence` property.
   * @returns The expected goals for the match.
   */
  private calculateExpectedGoals(homeTeam: any, awayTeam: any): number {
    // Simple expected goals model based on team strengths
    return (homeTeam.strengthAttack * awayTeam.strengthDefence) / 100;
  }
}