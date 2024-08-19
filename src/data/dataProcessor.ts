import { MongoClient, Db } from "mongodb";
import { logger } from "../utils/logger";

/**
 * The `DataProcessor` class is responsible for processing and storing data related to players, fixtures, and teams.
 *
 * It uses a MongoDB client to interact with the database and performs the following tasks:
 * - Processes player data, calculating total points, average points, and other relevant metrics, and stores the processed data in a separate collection.
 * - Processes fixture data, extracting relevant information such as event, teams, difficulty, and kickoff time, and stores the processed data in a separate collection.
 * - Processes team data, extracting relevant information such as team name, strength, and other metrics, and stores the processed data in a separate collection.
 *
 * The `DataProcessor` class is designed to be used as part of a larger application that requires the processing and storage of sports-related data.
 */
export class DataProcessor {
  private db: Db;

  /**
   * Initializes the MongoDB database connection for the `DataProcessor` class.
   *
   * @param mongoClient - The MongoDB client instance used to connect to the database.
   */
  constructor(private mongoClient: MongoClient) {
    this.db = this.mongoClient.db();
  }

  /**
   * Processes player, fixture, and team data, storing the processed data in separate collections in the database.
   *
   * This method is responsible for orchestrating the processing of the different data types. It calls the individual processing methods for each data type in sequence.
   */
  async processData() {
    await this.processPlayerData();
    await this.processFixtureData();
    await this.processTeamData();
  }

  /**
   * Processes player data, calculating total points, average points, and other relevant metrics, and stores the processed data in a separate collection.
   *
   * This method retrieves player data from the "player_summaries" collection, processes the data to calculate total points, average points, and other metrics, and then stores the processed data in the "processed_players" collection.
   */
  private async processPlayerData() {
    logger.info("Processing player data...");
    const playerCollection = this.db.collection("player_summaries");
    const processedPlayerCollection = this.db.collection("processed_players");

    const players = await playerCollection.find({}).toArray();

    const processedPlayers = players.map((player) => {
      const history = player.history || [];
      const totalPoints = history.reduce(
        (sum: number, gw: any) => sum + (gw.total_points || 0),
        0
      );
      const averagePoints =
        history.length > 0 ? totalPoints / history.length : 0;

      return {
        id: player.id,
        totalPoints,
        averagePoints,
        form: player.form || 0,
        valueForm: player.value_form || 0,
        valueSeason: player.value_season || 0,
        pointsPerGame: player.points_per_game || 0,
        selectedByPercent: player.selected_by_percent || 0,
        now_cost: player.now_cost || 0,
        history: player.history || [],
        fixtures: player.fixtures || [],
        // Add more features as needed
      };
    });

    await processedPlayerCollection.deleteMany({});
    await processedPlayerCollection.insertMany(processedPlayers);
    logger.info("Player data processed and stored.");
  }

  /**
   * Processes fixture data, extracting relevant information such as event, home team, away team, difficulty, and kickoff time, and stores the processed data in a separate collection.
   *
   * This method retrieves fixture data from the "fixtures" collection, processes the data to extract the relevant information, and then stores the processed data in the "processed_fixtures" collection.
   */
  private async processFixtureData() {
    logger.info("Processing fixture data...");
    const fixtureCollection = this.db.collection("fixtures");
    const processedFixtureCollection = this.db.collection("processed_fixtures");

    const fixtures = await fixtureCollection.find({}).toArray();

    const processedFixtures = fixtures.map((fixture) => {
      return {
        id: fixture.id,
        event: fixture.event,
        teamH: fixture.team_h,
        teamA: fixture.team_a,
        difficulty: fixture.difficulty,
        kickoffTime: fixture.kickoff_time,
        // Add more features as needed
      };
    });

    await processedFixtureCollection.deleteMany({});
    await processedFixtureCollection.insertMany(processedFixtures);
    logger.info("Fixture data processed and stored.");
  }

  /**
   * Processes team data, extracting relevant information such as team name, strength, overall strength, attack strength, and defense strength, and stores the processed data in a separate collection.
   *
   * This method retrieves team data from the "bootstrap_static" collection, processes the data to extract the relevant information, and then stores the processed data in the "processed_teams" collection.
   */
  private async processTeamData() {
    logger.info("Processing team data...");
    const bootstrapStaticCollection = this.db.collection("bootstrap_static");
    const processedTeamCollection = this.db.collection("processed_teams");

    const bootstrapStatic = await bootstrapStaticCollection.findOne({});
    const teams = bootstrapStatic?.teams || [];

    const processedTeams = teams.map((team: any) => {
      return {
        id: team.id,
        name: team.name,
        strength: team.strength,
        strengthOverall:
          team.strength_overall_home + team.strength_overall_away,
        strengthAttack: team.strength_attack_home + team.strength_attack_away,
        strengthDefence:
          team.strength_defence_home + team.strength_defence_away,
        // Add more features as needed
      };
    });

    await processedTeamCollection.deleteMany({});
    await processedTeamCollection.insertMany(processedTeams);
    logger.info("Team data processed and stored.");
  }
}
