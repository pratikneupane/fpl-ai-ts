import { MongoClient } from 'mongodb';
import { FPLApiService } from '../services/fplApiService';
import { logger } from '../utils/logger';

/**
 * Responsible for fetching and storing data from the FPL API into a MongoDB database.
 * This class provides methods to fetch and store the following data:
 * - Bootstrap static data
 * - Fixtures data
 * - Player summary data
 * - Gameweek live data
 * 
 * The class takes a `MongoClient` instance in its constructor, which is used to interact with the MongoDB database.
 */
export class FPLDataCollector {
  private mongoClient: MongoClient;

  /**
   * Constructs a new instance of the `FPLDataCollector` class, which is responsible for fetching and storing data from the FPL API into a MongoDB database.
   *
   * @param mongoClient - The `MongoClient` instance to be used for interacting with the MongoDB database.
   */
  constructor(mongoClient: MongoClient) {
    this.mongoClient = mongoClient;
  }

  /**
   * Fetches the bootstrap static data from the FPL API and stores it in the MongoDB database.
   *
   * This method is responsible for fetching the bootstrap static data, which contains information about the current season, teams, players, and other static data used by the Fantasy Premier League (FPL) application. The fetched data is then stored in the 'bootstrap_static' collection in the MongoDB database.
   *
   * If an error occurs during the fetch or storage process, an error message is logged using the `logger` utility.
   */
  async fetchAndStoreBootstrapStatic() {
    try {
      const data = await FPLApiService.getBootstrapStatic();
      const db = this.mongoClient.db();
      await db.collection('bootstrap_static').deleteMany({});
      await db.collection('bootstrap_static').insertOne(data);
      logger.info('Bootstrap static data stored successfully');
    } catch (error) {
      logger.error('Error fetching bootstrap static data:', error);
    }
  }

  /**
   * Fetches the fixtures data from the FPL API and stores it in the MongoDB database.
   *
   * This method is responsible for fetching the fixtures data, which contains information about the upcoming matches in the current season of the Fantasy Premier League (FPL). The fetched data is then stored in the 'fixtures' collection in the MongoDB database.
   *
   * If an error occurs during the fetch or storage process, an error message is logged using the `logger` utility.
   */
  async fetchAndStoreFixtures() {
    try {
      const data = await FPLApiService.getFixtures();
      const db = this.mongoClient.db();
      await db.collection('fixtures').deleteMany({});
      await db.collection('fixtures').insertMany(data);
      logger.info('Fixtures data stored successfully');
    } catch (error) {
      logger.error('Error fetching fixtures data:', error);
    }
  }

  /**
   * Fetches the player summary data from the FPL API and stores it in the MongoDB database.
   *
   * This method is responsible for fetching the player summary data, which contains information about a specific player in the Fantasy Premier League (FPL). The fetched data is then stored in the 'player_summaries' collection in the MongoDB database.
   *
   * @param playerId - The ID of the player whose summary data should be fetched and stored.
   *
   * If an error occurs during the fetch or storage process, an error message is logged using the `logger` utility.
   */
  async fetchAndStorePlayerSummary(playerId: number) {
    try {
      const data = await FPLApiService.getPlayerSummary(playerId);
      const db = this.mongoClient.db();
      await db.collection('player_summaries').updateOne(
        { id: playerId },
        { $set: data },
        { upsert: true }
      );
      logger.info(`Player summary for ID ${playerId} stored successfully`);
    } catch (error) {
      logger.error(`Error fetching player summary for ID ${playerId}:`, error);
    }
  }

  /**
   * Fetches the live data for the specified gameweek from the FPL API and stores it in the MongoDB database.
   *
   * This method is responsible for fetching the live data for a specific gameweek, which contains up-to-date information about the current state of the Fantasy Premier League (FPL) for that gameweek. The fetched data is then stored in the 'gameweek_live' collection in the MongoDB database.
   *
   * @param gameweek - The gameweek number for which the live data should be fetched and stored.
   *
   * If an error occurs during the fetch or storage process, an error message is logged using the `logger` utility.
   */
  async fetchAndStoreGameweekLive(gameweek: number) {
    try {
      const data = await FPLApiService.getGameweekLive(gameweek);
      const db = this.mongoClient.db();
      await db.collection('gameweek_live').updateOne(
        { id: gameweek },
        { $set: data },
        { upsert: true }
      );
      logger.info(`Gameweek ${gameweek} live data stored successfully`);
    } catch (error) {
      logger.error(`Error fetching gameweek ${gameweek} live data:`, error);
    }
  }

  /**
   * Fetches and stores all the necessary data for the Fantasy Premier League (FPL) application.
   *
   * This method is responsible for fetching and storing the following data:
   * - Bootstrap static data: Fetches the initial static data for the FPL application and stores it in the 'bootstrap_static' collection.
   * - Fixtures data: Fetches the fixtures data and stores it in the 'fixtures' collection.
   * - Player summary data: Fetches the summary data for each player and stores it in the 'player_summaries' collection.
   * - Gameweek live data: Fetches the live data for each gameweek and stores it in the 'gameweek_live' collection.
   *
   * This method is intended to be called periodically (e.g., daily or weekly) to ensure that the application has the most up-to-date data.
   */
  async fetchAllData() {
    await this.fetchAndStoreBootstrapStatic();
    await this.fetchAndStoreFixtures();

    const db = this.mongoClient.db();
    const bootstrapStatic = await db.collection('bootstrap_static').findOne({});
    const players = bootstrapStatic?.elements || [];

    for (const player of players) {
      await this.fetchAndStorePlayerSummary(player.id);
    }

    const totalGameweeks = 38;
    for (let gw = 1; gw <= totalGameweeks; gw++) {
      await this.fetchAndStoreGameweekLive(gw);
    }
  }
}