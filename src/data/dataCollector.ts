import { MongoClient } from "mongodb";
import { FPLApiService } from "../services/fplApiService";
import { logger } from "../utils/logger";

export class FPLDataCollector {
  private mongoClient: MongoClient;

  constructor(mongoClient: MongoClient) {
    this.mongoClient = mongoClient;
  }

  async fetchAndStoreBootstrapStatic() {
    try {
      const data = await FPLApiService.getBootstrapStatic();
      const db = this.mongoClient.db();
      await db.collection("bootstrap_static").deleteMany({});
      await db.collection("bootstrap_static").insertOne(data);

      logger.info("Bootstrap static data stored successfully");

      await db.collection("teams").deleteMany({});
      await db.collection("teams").insertMany(data.teams);

      logger.info("Teams data stored successfully");

      await db.collection("players").deleteMany({});
      await db.collection("players").insertMany(data.elements);

      logger.info("Players data stored successfully");

      await db.collection("gameweeks").deleteMany({});
      await db.collection("gameweeks").insertMany(data.events);

      logger.info("Gameweeks data stored successfully");

      await db.collection("elements_types").deleteMany({});
      await db.collection("elements_types").insertMany(data.element_types);

      logger.info("Elements types data stored successfully");
    } catch (error) {
      logger.error("Error fetching bootstrap static data:", error);
    }
  }

  async fetchAndStoreFixtures() {
    try {
      const data = await FPLApiService.getFixtures();
      const db = this.mongoClient.db();
      await db.collection("fixtures").deleteMany({});
      await db.collection("fixtures").insertMany(data);
      logger.info("Fixtures data stored successfully");
    } catch (error) {
      logger.error("Error fetching fixtures data:", error);
    }
  }

  async fetchAndStorePlayerSummary(playerId: number) {
    try {
      const data = await FPLApiService.getPlayerSummary(playerId);
      const db = this.mongoClient.db();
      await db
        .collection("player_summaries")
        .updateOne({ id: playerId }, { $set: data }, { upsert: true });
      logger.info(`Player summary for ID ${playerId} stored successfully`);
    } catch (error) {
      logger.error(`Error fetching player summary for ID ${playerId}:`, error);
    }
  }

  async fetchAndStoreGameweekLive(gameweek: number) {
    try {
      const data = await FPLApiService.getGameweekLive(gameweek);
      const db = this.mongoClient.db();
      await db
        .collection("gameweek_live")
        .updateOne({ id: gameweek }, { $set: data }, { upsert: true });
      logger.info(`Gameweek ${gameweek} live data stored successfully`);
    } catch (error) {
      logger.error(`Error fetching gameweek ${gameweek} live data:`, error);
    }
  }

  async fetchAllData() {
    await this.fetchAndStoreBootstrapStatic();
    await this.fetchAndStoreFixtures();

    const db = this.mongoClient.db();

    const players = await db.collection("players").find({}).toArray();

    for (const player of players) {
      await this.fetchAndStorePlayerSummary(player.id);
    }

    const totalGameweeks = 38;
    for (let gw = 1; gw <= totalGameweeks; gw++) {
      await this.fetchAndStoreGameweekLive(gw);
    }
  }
}
