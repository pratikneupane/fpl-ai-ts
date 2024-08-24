import { MongoClient } from "mongodb";
import { FPLApiService } from "../../services/fplApiService";
import { logger } from "../../utils/logger";
import { FPLDataCollector } from "../../data/dataCollector";

// Mocking the dependencies
jest.mock("../../services/fplApiService");
jest.mock("../../utils/logger");

describe("FPLDataCollector", () => {
  let mongoClient: jest.Mocked<MongoClient>;
  let collector: FPLDataCollector;

  beforeEach(() => {
    mongoClient = {
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnThis(),
        deleteMany: jest.fn().mockResolvedValue({}),
        insertOne: jest.fn().mockResolvedValue({}),
        insertMany: jest.fn().mockResolvedValue({}),
        updateOne: jest.fn().mockResolvedValue({}),
        find: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      }),
    } as unknown as jest.Mocked<MongoClient>;

    collector = new FPLDataCollector(mongoClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("fetchAndStoreBootstrapStatic should store data correctly", async () => {
    const mockData = {
      teams: [],
      elements: [],
      events: [],
      element_types: [],
    };
    (FPLApiService.getBootstrapStatic as jest.Mock).mockResolvedValue(mockData);

    await collector.fetchAndStoreBootstrapStatic();

    expect(FPLApiService.getBootstrapStatic).toHaveBeenCalled();
    expect(
      mongoClient.db().collection("bootstrap_static").deleteMany
    ).toHaveBeenCalled();
    expect(
      mongoClient.db().collection("bootstrap_static").insertOne
    ).toHaveBeenCalledWith(mockData);
    expect(mongoClient.db().collection("teams").deleteMany).toHaveBeenCalled();
    expect(
      mongoClient.db().collection("teams").insertMany
    ).toHaveBeenCalledWith(mockData.teams);
    expect(
      mongoClient.db().collection("players").deleteMany
    ).toHaveBeenCalled();
    expect(
      mongoClient.db().collection("players").insertMany
    ).toHaveBeenCalledWith(mockData.elements);
    expect(
      mongoClient.db().collection("gameweeks").deleteMany
    ).toHaveBeenCalled();
    expect(
      mongoClient.db().collection("gameweeks").insertMany
    ).toHaveBeenCalledWith(mockData.events);
    expect(
      mongoClient.db().collection("elements_types").deleteMany
    ).toHaveBeenCalled();
    expect(
      mongoClient.db().collection("elements_types").insertMany
    ).toHaveBeenCalledWith(mockData.element_types);
    expect(logger.info).toHaveBeenCalledWith(
      "Bootstrap static data stored successfully"
    );
  });

  test("fetchAndStoreFixtures should store data correctly", async () => {
    const mockData: any[] = [];
    (FPLApiService.getFixtures as jest.Mock).mockResolvedValue(mockData);

    await collector.fetchAndStoreFixtures();

    expect(FPLApiService.getFixtures).toHaveBeenCalled();
    expect(
      mongoClient.db().collection("fixtures").deleteMany
    ).toHaveBeenCalled();
    expect(
      mongoClient.db().collection("fixtures").insertMany
    ).toHaveBeenCalledWith(mockData);
    expect(logger.info).toHaveBeenCalledWith(
      "Fixtures data stored successfully"
    );
  });

  test("fetchAndStorePlayerSummary should store player summary correctly", async () => {
    const playerId = 1;
    const mockData = { id: playerId };
    (FPLApiService.getPlayerSummary as jest.Mock).mockResolvedValue(mockData);

    await collector.fetchAndStorePlayerSummary(playerId);

    expect(FPLApiService.getPlayerSummary).toHaveBeenCalledWith(playerId);
    expect(
      mongoClient.db().collection("player_summaries").updateOne
    ).toHaveBeenCalledWith(
      { id: playerId },
      { $set: mockData },
      { upsert: true }
    );
    expect(logger.info).toHaveBeenCalledWith(
      `Player summary for ID ${playerId} stored successfully`
    );
  });

  test("fetchAndStoreGameweekLive should store gameweek live data correctly", async () => {
    const gameweek = 1;
    const mockData = { id: gameweek };
    (FPLApiService.getGameweekLive as jest.Mock).mockResolvedValue(mockData);

    await collector.fetchAndStoreGameweekLive(gameweek);

    expect(FPLApiService.getGameweekLive).toHaveBeenCalledWith(gameweek);
    expect(
      mongoClient.db().collection("gameweek_live").updateOne
    ).toHaveBeenCalledWith(
      { id: gameweek },
      { $set: mockData },
      { upsert: true }
    );
    expect(logger.info).toHaveBeenCalledWith(
      `Gameweek ${gameweek} live data stored successfully`
    );
  });

  test("fetchAllData should fetch and store all data correctly", async () => {
    const mockPlayerData = [{ id: 1 }];
    (
      mongoClient.db().collection("players").find().toArray as jest.Mock
    ).mockResolvedValue(mockPlayerData);
    const mockFixturesData: never[] = [];
    const mockPlayerSummaryData = { id: 1 };
    const mockGameweekLiveData = { id: 1 };

    (FPLApiService.getFixtures as jest.Mock).mockResolvedValue(
      mockFixturesData
    );
    (FPLApiService.getPlayerSummary as jest.Mock).mockResolvedValue(
      mockPlayerSummaryData
    );
    (FPLApiService.getGameweekLive as jest.Mock).mockResolvedValue(
      mockGameweekLiveData
    );

    await collector.fetchAllData();

    expect(FPLApiService.getBootstrapStatic).toHaveBeenCalled();
    expect(FPLApiService.getFixtures).toHaveBeenCalled();
    expect(FPLApiService.getPlayerSummary).toHaveBeenCalledWith(1);
    expect(FPLApiService.getGameweekLive).toHaveBeenCalledWith(1);
  });});
