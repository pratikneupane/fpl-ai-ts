import { MongoClient, Db, Collection } from "mongodb";
import { DataProcessor } from "../../data/dataProcessor";
import { logger } from "../../utils/logger";

jest.mock("../../utils/logger");

describe("DataProcessor", () => {
  let mongoClient: jest.Mocked<MongoClient>;
  let dataProcessor: DataProcessor;
  let mockCollection: jest.Mocked<Collection<any>>;

  beforeEach(() => {
    mockCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
      deleteMany: jest.fn().mockResolvedValue({}),
      insertMany: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<Collection<any>>;

    mongoClient = {
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue(mockCollection),
      }),
    } as unknown as jest.Mocked<MongoClient>;

    dataProcessor = new DataProcessor(mongoClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("processPlayerData should process and store player data correctly", async () => {
    const mockPlayers = [
      { id: 1, history: [], fixtures: [], history_past: [] },
    ];
    const mockProcessedPlayers = [
      {
        id: 1,
        totalPoints: 0,
        averagePoints: 0,
        form: 0,
        valueForm: 0,
        valueSeason: 0,
        pointsPerGame: 0,
        selectedByPercent: 0,
        now_cost: 0,
        minutesPlayed: 0,
        minutesPerGame: 0,
        goalsScored: 0,
        goalsPerGame: 0,
        assists: 0,
        assistsPerGame: 0,
        cleanSheets: 0,
        goalsConceded: 0,
        xG: 0,
        xA: 0,
        xGI: 0,
        upcomingFixtureDifficulty: 0,
        seasonOnSeasonPerformance: 1,
        lastSeasonPoints: 0,
        history: [],
        fixtures: [],
      },
    ];
    mongoClient
      .db()
      .collection("player_summaries")
      .find()
      .toArray = jest.fn().mockResolvedValue(mockPlayers);

    // Spy on the methods to ensure they are called
    const deleteManySpy = jest.spyOn(mockCollection, "deleteMany");
    const insertManySpy = jest.spyOn(mockCollection, "insertMany");

    await (dataProcessor as any).processPlayerData();

    expect(
      mongoClient.db().collection("player_summaries").find
    ).toHaveBeenCalled();
    expect(deleteManySpy).toHaveBeenCalled();
    expect(insertManySpy).toHaveBeenCalledWith(mockProcessedPlayers);
    expect(logger.info).toHaveBeenCalledWith(
      "Player data processed and stored."
    );
  });
  test("processFixtureData should process and store fixture data correctly", async () => {
    const mockFixtures = [{ id: 1, stats: [] }];
    const mockProcessedFixtures = [
      {
        id: 1,
        homeGoals: 0,
        awayGoals: 0,
        homeAssists: 0,
        awayAssists: 0,
        homeOwnGoals: 0,
        awayOwnGoals: 0,
        homePenaltiesSaved: 0,
        awayPenaltiesSaved: 0,
        homePenaltiesMissed: 0,
        awayPenaltiesMissed: 0,
        homeYellowCards: 0,
        awayYellowCards: 0,
        homeRedCards: 0,
        awayRedCards: 0,
        homeSaves: 0,
        awaySaves: 0,
        homeBonus: 0,
        awayBonus: 0,
        homeBps: 0,
        awayBps: 0,
      },
    ];
    mongoClient
      .db()
      .collection("fixtures")
      .find()
      .toArray = jest.fn().mockResolvedValue(mockFixtures);

    // Spy on the methods to ensure they are called
    const deleteManySpy = jest.spyOn(mockCollection, "deleteMany");
    const insertManySpy = jest.spyOn(mockCollection, "insertMany");

    await (dataProcessor as any).processFixtureData();

    expect(mongoClient.db().collection("fixtures").find).toHaveBeenCalled();
    expect(deleteManySpy).toHaveBeenCalled();
    expect(insertManySpy).toHaveBeenCalledWith(mockProcessedFixtures);
    expect(logger.info).toHaveBeenCalledWith(
      "Fixture data processed and stored."
    );
  });

  test("processTeamData should process and store team data correctly", async () => {
    const mockTeams = [
      {
        id: 1,
        strength_overall_home: 0,
        strength_overall_away: 0,
        strength_attack_home: 0,
        strength_attack_away: 0,
        strength_defence_home: 0,
        strength_defence_away: 0,
      },
    ];
    const mockProcessedTeams = [
      {
        id: 1,
        averageOverallStrength: 0,
        averageAttackStrength: 0,
        averageDefenceStrength: 0,
        overallStrengthHomeBias: 0,
        attackStrengthHomeBias: 0,
        defenceStrengthHomeBias: 0,
      },
    ];
    mongoClient
      .db()
      .collection("teams")
      .find()
      .toArray = jest.fn().mockResolvedValue(mockTeams);

    // Spy on the methods to ensure they are called
    const deleteManySpy = jest.spyOn(mockCollection, "deleteMany");
    const insertManySpy = jest.spyOn(mockCollection, "insertMany");

    await (dataProcessor as any).processTeamData();

    expect(mongoClient.db().collection("teams").find).toHaveBeenCalled();
    expect(deleteManySpy).toHaveBeenCalled();
    expect(insertManySpy).toHaveBeenCalledWith(mockProcessedTeams);
    expect(logger.info).toHaveBeenCalledWith("Team data processed and stored.");
  });  test("processData should call processPlayerData, processFixtureData, and processTeamData in sequence", async () => {
    const processPlayerDataSpy = jest.spyOn(dataProcessor, "processPlayerData" as keyof typeof dataProcessor);
    const processFixtureDataSpy = jest.spyOn(
      dataProcessor,
      "processFixtureData" as keyof typeof dataProcessor
    );
    const processTeamDataSpy = jest.spyOn(dataProcessor, "processTeamData" as keyof typeof dataProcessor);

    await dataProcessor.processData();

    expect(processPlayerDataSpy).toHaveBeenCalled();
    expect(processFixtureDataSpy).toHaveBeenCalled();
    expect(processTeamDataSpy).toHaveBeenCalled();
  });
});
