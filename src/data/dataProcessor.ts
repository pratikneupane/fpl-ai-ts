import { MongoClient, Db } from "mongodb";
import { logger } from "../utils/logger";

export class DataProcessor {
  private db: Db;

  constructor(private mongoClient: MongoClient) {
    this.db = this.mongoClient.db();
  }

  async processData() {
    await this.processPlayerData();
    await this.processFixtureData();
    await this.processTeamData();
  }

  private async processPlayerData() {
    logger.info("Processing player data...");
    const playerCollection = this.db.collection("player_summaries");
    const processedPlayerCollection = this.db.collection("processed_players");

    const players = await playerCollection.find({}).toArray();

    const processedPlayers = players.map((player) => {
      const history = player.history || [];
      const fixtures = player.fixtures || [];
      const historyPast = player.history_past || [];

      // Calculate current season stats
      const totalPoints = history.reduce(
        (sum: any, gw: { total_points: any }) => sum + (gw.total_points || 0),
        0
      );
      const totalMinutes = history.reduce(
        (sum: any, gw: { minutes: any }) => sum + (gw.minutes || 0),
        0
      );
      const goalsScored = history.reduce(
        (sum: any, gw: { goals_scored: any }) => sum + (gw.goals_scored || 0),
        0
      );
      const assists = history.reduce(
        (sum: any, gw: { assists: any }) => sum + (gw.assists || 0),
        0
      );
      const cleanSheets = history.reduce(
        (sum: any, gw: { clean_sheets: any }) => sum + (gw.clean_sheets || 0),
        0
      );
      const goalsConceded = history.reduce(
        (sum: any, gw: { goals_conceded: any }) =>
          sum + (gw.goals_conceded || 0),
        0
      );

      // Calculate averages and rates
      const gamesPlayed = history.length;
      const averagePoints = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;
      const minutesPerGame = gamesPlayed > 0 ? totalMinutes / gamesPlayed : 0;
      const goalsPerGame = gamesPlayed > 0 ? goalsScored / gamesPlayed : 0;
      const assistsPerGame = gamesPlayed > 0 ? assists / gamesPlayed : 0;

      // Calculate form (average points over last 5 games)
      const recentGames = history.slice(-5);
      const recentPoints = recentGames.reduce(
        (sum: any, gw: { total_points: any }) => sum + (gw.total_points || 0),
        0
      );
      const form =
        recentGames.length > 0 ? recentPoints / recentGames.length : 0;

      // Calculate expected stats averages
      const xG =
        history.reduce(
          (sum: number, gw: { expected_goals: any }) =>
            sum + parseFloat(gw.expected_goals || "0"),
          0
        ) / gamesPlayed;
      const xA =
        history.reduce(
          (sum: number, gw: { expected_assists: any }) =>
            sum + parseFloat(gw.expected_assists || "0"),
          0
        ) / gamesPlayed;
      const xGI =
        history.reduce(
          (sum: number, gw: { expected_goal_involvements: any }) =>
            sum + parseFloat(gw.expected_goal_involvements || "0"),
          0
        ) / gamesPlayed;

      // Analyze upcoming fixtures
      const nextFiveFixtures = fixtures.slice(0, 5);
      const upcomingDifficulty =
        nextFiveFixtures.reduce(
          (sum: any, fixture: { difficulty: any }) =>
            sum + (fixture.difficulty || 0),
          0
        ) / 5;

      // Past seasons performance
      const lastSeason = historyPast[historyPast.length - 1] || {};
      const seasonOnSeason = lastSeason.total_points
        ? totalPoints /
          gamesPlayed /
          (lastSeason.total_points / (lastSeason.starts || 38))
        : 1;

      return {
        id: player.id,
        totalPoints,
        averagePoints,
        form: form,
        valueForm: player.value_form || 0,
        valueSeason: player.value_season || 0,
        pointsPerGame: player.points_per_game || 0,
        selectedByPercent: player.selected_by_percent || 0,
        now_cost: player.now_cost || 0,
        minutesPlayed: totalMinutes,
        minutesPerGame,
        goalsScored,
        goalsPerGame,
        assists,
        assistsPerGame,
        cleanSheets,
        goalsConceded,
        xG,
        xA,
        xGI,
        upcomingFixtureDifficulty: upcomingDifficulty,
        seasonOnSeasonPerformance: seasonOnSeason,
        lastSeasonPoints: lastSeason.total_points || 0,
        history: history,
        fixtures: fixtures,
      };
    });

    await processedPlayerCollection.deleteMany({});
    await processedPlayerCollection.insertMany(processedPlayers);
    logger.info("Player data processed and stored.");
  }

  private async processFixtureData() {
    logger.info("Processing fixture data...");
    const fixtureCollection = this.db.collection("fixtures");
    const processedFixtureCollection = this.db.collection("processed_fixtures");

    const fixtures = await fixtureCollection.find({}).toArray();

    const processedFixtures = fixtures.map((fixture) => {
      const stats = fixture.stats || [];

      // Helper function to sum up values for a specific stat
      const sumStat = (identifier: string, team: "h" | "a") =>
        stats
          .find((s: { identifier: string }) => s.identifier === identifier)
          ?.[team]?.reduce(
            (sum: any, item: { value: any }) => sum + item.value,
            0
          ) || 0;

      // Extract relevant statistics
      const homeGoals = sumStat("goals_scored", "h");
      const awayGoals = sumStat("goals_scored", "a");
      const homeAssists = sumStat("assists", "h");
      const awayAssists = sumStat("assists", "a");
      const homeOwnGoals = sumStat("own_goals", "h");
      const awayOwnGoals = sumStat("own_goals", "a");
      const homePenaltiesSaved = sumStat("penalties_saved", "h");
      const awayPenaltiesSaved = sumStat("penalties_saved", "a");
      const homePenaltiesMissed = sumStat("penalties_missed", "h");
      const awayPenaltiesMissed = sumStat("penalties_missed", "a");
      const homeYellowCards = sumStat("yellow_cards", "h");
      const awayYellowCards = sumStat("yellow_cards", "a");
      const homeRedCards = sumStat("red_cards", "h");
      const awayRedCards = sumStat("red_cards", "a");
      const homeSaves = sumStat("saves", "h");
      const awaySaves = sumStat("saves", "a");
      const homeBonus = sumStat("bonus", "h");
      const awayBonus = sumStat("bonus", "a");
      const homeBps = sumStat("bps", "h");
      const awayBps = sumStat("bps", "a");

      return {
        id: fixture.id,
        event: fixture.event,
        teamH: fixture.team_h,
        teamA: fixture.team_a,
        teamHDifficulty: fixture.team_h_difficulty,
        teamADifficulty: fixture.team_a_difficulty,
        kickoffTime: fixture.kickoff_time,
        finished: fixture.finished,
        started: fixture.started,
        minutes: fixture.minutes,
        teamHScore: fixture.team_h_score,
        teamAScore: fixture.team_a_score,
        homeGoals,
        awayGoals,
        homeAssists,
        awayAssists,
        homeOwnGoals,
        awayOwnGoals,
        homePenaltiesSaved,
        awayPenaltiesSaved,
        homePenaltiesMissed,
        awayPenaltiesMissed,
        homeYellowCards,
        awayYellowCards,
        homeRedCards,
        awayRedCards,
        homeSaves,
        awaySaves,
        homeBonus,
        awayBonus,
        homeBps,
        awayBps,
        pulseId: fixture.pulse_id,
      };
    });

    await processedFixtureCollection.deleteMany({});
    await processedFixtureCollection.insertMany(processedFixtures);
    logger.info("Fixture data processed and stored.");
  }

  private async processTeamData() {
    logger.info("Processing team data...");
    const teamCollection = this.db.collection("teams");
    const processedTeamCollection = this.db.collection("processed_teams");

    const teams = await teamCollection.find({}).toArray();

    const processedTeams = teams.map((team) => {
      // Calculate average strengths
      const avgOverallStrength =
        (team.strength_overall_home + team.strength_overall_away) / 2;
      const avgAttackStrength =
        (team.strength_attack_home + team.strength_attack_away) / 2;
      const avgDefenceStrength =
        (team.strength_defence_home + team.strength_defence_away) / 2;

      // Calculate home and away strength differences
      const overallStrengthDiff =
        team.strength_overall_home - team.strength_overall_away;
      const attackStrengthDiff =
        team.strength_attack_home - team.strength_attack_away;
      const defenceStrengthDiff =
        team.strength_defence_home - team.strength_defence_away;

      return {
        id: team.id,
        code: team.code,
        name: team.name,
        shortName: team.short_name,
        strength: team.strength,
        form: team.form,
        position: team.position,
        played: team.played,
        points: team.points,
        won: team.win,
        drawn: team.draw,
        lost: team.loss,
        strengthOverallHome: team.strength_overall_home,
        strengthOverallAway: team.strength_overall_away,
        strengthAttackHome: team.strength_attack_home,
        strengthAttackAway: team.strength_attack_away,
        strengthDefenceHome: team.strength_defence_home,
        strengthDefenceAway: team.strength_defence_away,
        averageOverallStrength: avgOverallStrength,
        averageAttackStrength: avgAttackStrength,
        averageDefenceStrength: avgDefenceStrength,
        overallStrengthHomeBias: overallStrengthDiff,
        attackStrengthHomeBias: attackStrengthDiff,
        defenceStrengthHomeBias: defenceStrengthDiff,
        unavailable: team.unavailable,
        pulseId: team.pulse_id,
      };
    });

    await processedTeamCollection.deleteMany({});
    await processedTeamCollection.insertMany(processedTeams);
    logger.info("Team data processed and stored.");
  }
}
