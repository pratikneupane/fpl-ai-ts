import { MongoClient, Db } from "mongodb";
import { logger } from "../utils/logger";

export class FeatureEngineer {
  private db: Db;
  constructor(private mongoClient: MongoClient) {
    this.db = this.mongoClient.db();
  }
  async engineerFeatures() {
    await this.createPlayerFeatures();
    await this.createFixtureFeatures();
  }

  private async createPlayerFeatures() {
    logger.info("Engineering player features...");
    const processedPlayerCollection = this.db.collection("processed_players");
    const featureCollection = this.db.collection("player_features");
    const players = await processedPlayerCollection.find({}).toArray();

    const playerFeatures = players.map((player) => {
      const lastSeason = player.history.filter(
        (game: { round: number }) => game.round <= 38
      );
      const currentSeason = player.history.filter(
        (game: { round: number }) => game.round > 38
      );

      return {
        id: player.id,
        recentFormScore: this.calculateRecentForm(player.history),
        pricePerformanceRatio: player.totalPoints / (player.now_cost || 1),
        consistencyScore: this.calculateConsistency(player.history),
        upcomingFixtureDifficulty: this.calculateUpcomingFixtureDifficulty(
          player.fixtures
        ),

        // New features
        goalContribution: player.goalsScored + player.assists,
        goalContributionPerGame:
          (player.goalsScored + player.assists) /
          (player.minutesPlayed / 90 || 1),
        xGOverPerformance: player.goalsScored - player.xG,
        xAOverPerformance: player.assists - player.xA,
        minutesPlayedPercentage: (player.minutesPlayed / (38 * 90)) * 100,
        homeAwayPerformanceDelta: this.calculateHomeAwayDelta(player.history),
        formTrend: this.calculateFormTrend(currentSeason),
        seasonOnSeasonImprovement: this.calculateSeasonImprovement(
          lastSeason,
          currentSeason
        ),
        injuryProneness: this.calculateInjuryProneness(player.history),
        bigChanceInvolvement:
          (player.xG + player.xA) / (player.minutesPlayed / 90 || 1),
        priceChangeResilience: this.calculatePriceChangeResilience(
          player.history
        ),
        teamPerformanceImpact: this.calculateTeamImpact(player.history),
        difficultyAdjustedPerformance: this.adjustPerformanceForDifficulty(
          player.history
        ),

        // Positional specific features
        cleanSheetContribution:
          player.cleanSheets / (player.minutesPlayed / 90 || 1),
        savePercentage:
          player.saves / (player.saves + player.goalsConceded || 1),
        bonusPointsPerGame:
          player.history.reduce(
            (sum: any, game: { bonus: any }) => sum + game.bonus,
            0
          ) / player.history.length,
      };
    });

    await featureCollection.deleteMany({});
    await featureCollection.insertMany(playerFeatures);
    logger.info("Player features engineered and stored.");
  }

  private async createFixtureFeatures() {
    logger.info("Engineering fixture features...");
    const processedFixtureCollection = this.db.collection("processed_fixtures");
    const processedTeamCollection = this.db.collection("processed_teams");
    const featureCollection = this.db.collection("fixture_features");

    const fixtures = await processedFixtureCollection.find({}).toArray();
    const teams = await processedTeamCollection.find({}).toArray();

    const fixtureFeatures = await Promise.all(
      fixtures.map(async (fixture) => {
        const homeTeam = teams.find((team) => team.id === fixture.teamH);
        const awayTeam = teams.find((team) => team.id === fixture.teamA);

        return {
          id: fixture.id,
          event: fixture.event,
          homeTeamStrength: homeTeam?.strength || 0,
          awayTeamStrength: awayTeam?.strength || 0,
          strengthDifference:
            (homeTeam?.strength || 0) - (awayTeam?.strength || 0),
          expectedGoals: this.calculateExpectedGoals(homeTeam, awayTeam),

          // New features
          homeAttackStrength: homeTeam?.strengthAttackHome || 0,
          awayAttackStrength: awayTeam?.strengthAttackAway || 0,
          homeDefenseStrength: homeTeam?.strengthDefenceHome || 0,
          awayDefenseStrength: awayTeam?.strengthDefenceAway || 0,
          homeOverallStrength: homeTeam?.strengthOverallHome || 0,
          awayOverallStrength: awayTeam?.strengthOverallAway || 0,

          homeFactor: this.calculateHomeFactor(homeTeam),
          awayFactor: this.calculateAwayFactor(awayTeam),

          expectedHomeGoals: this.calculateExpectedTeamGoals(
            homeTeam?.strengthAttackHome || 0,
            awayTeam?.strengthDefenceAway || 0
          ),
          expectedAwayGoals: this.calculateExpectedTeamGoals(
            awayTeam?.strengthAttackAway || 0,
            homeTeam?.strengthDefenceHome || 0
          ),

          homeFormFactor: homeTeam?.form || 0,
          awayFormFactor: awayTeam?.form || 0,

          homePositionStrength: this.calculatePositionStrength(
            homeTeam?.position || 0
          ),
          awayPositionStrength: this.calculatePositionStrength(
            awayTeam?.position || 0
          ),

          difficultyRating:
            (fixture.teamHDifficulty + fixture.teamADifficulty) / 2,

          expectedCleanSheetHome: this.calculateExpectedCleanSheet(
            homeTeam?.strengthDefenceHome || 0,
            awayTeam?.strengthAttackAway || 0
          ),
          expectedCleanSheetAway: this.calculateExpectedCleanSheet(
            awayTeam?.strengthDefenceAway || 0,
            homeTeam?.strengthAttackHome || 0
          ),

          expectedCards: this.calculateExpectedCards(
            fixture.teamHDifficulty,
            fixture.teamADifficulty
          ),

          homePreviousPerformance: this.calculatePreviousPerformance(homeTeam),
          awayPreviousPerformance: this.calculatePreviousPerformance(awayTeam),

          isDerby: this.isDerbyMatch(homeTeam, awayTeam),

          // If the fixture is finished, include actual results for model training
          actualResult: fixture.finished ? this.getActualResult(fixture) : null,
          actualGoals: fixture.finished
            ? { home: fixture.homeGoals, away: fixture.awayGoals }
            : null,
          actualCards: fixture.finished
            ? {
                yellow: fixture.homeYellowCards + fixture.awayYellowCards,
                red: fixture.homeRedCards + fixture.awayRedCards,
              }
            : null,
        };
      })
    );

    await featureCollection.deleteMany({});
    await featureCollection.insertMany(fixtureFeatures);
    logger.info("Fixture features engineered and stored.");
  }
  // Helper function implementations

  private calculateExpectedGoals(homeTeam: any, awayTeam: any): number {
    const homeAttack = homeTeam?.strengthAttackHome || 1000;
    const awayDefense = awayTeam?.strengthDefenceAway || 1000;
    const awayAttack = awayTeam?.strengthAttackAway || 1000;
    const homeDefense = homeTeam?.strengthDefenceHome || 1000;

    const homeExpectedGoals = (homeAttack / awayDefense) * 1.25; // 1.25 is an average number of goals
    const awayExpectedGoals = (awayAttack / homeDefense) * 1.25;

    return homeExpectedGoals + awayExpectedGoals;
  }

  private calculateHomeFactor(team: any): number {
    const homeStrength = team?.strengthOverallHome || 1000;
    const overallStrength = team?.averageOverallStrength || 1000;
    return homeStrength / overallStrength;
  }

  private calculateAwayFactor(team: any): number {
    const awayStrength = team?.strengthOverallAway || 1000;
    const overallStrength = team?.averageOverallStrength || 1000;
    return awayStrength / overallStrength;
  }

  private calculateExpectedTeamGoals(
    attackStrength: number,
    opponentDefenseStrength: number
  ): number {
    return (attackStrength / opponentDefenseStrength) * 1.25; // 1.25 is an average number of goals
  }

  private calculatePositionStrength(position: number): number {
    // Assuming 20 teams in the league
    return Math.max(0.05, 1 - (position - 1) / 19);
  }

  private calculateExpectedCleanSheet(
    defenseStrength: number,
    opponentAttackStrength: number
  ): number {
    const goalExpectancy = this.calculateExpectedTeamGoals(
      opponentAttackStrength,
      defenseStrength
    );
    return Math.exp(-goalExpectancy); // Poisson distribution for P(X=0)
  }

  private calculateExpectedCards(
    homeDifficulty: number,
    awayDifficulty: number
  ): number {
    const averageDifficulty = (homeDifficulty + awayDifficulty) / 2;
    // Assuming average cards per game is 3 and max difficulty is 5
    return (averageDifficulty / 5) * 3;
  }

  private calculatePreviousPerformance(team: any): number {
    const gamesPlayed = team?.played || 0;
    if (gamesPlayed === 0) return 0;

    const pointsPerGame = (team?.points || 0) / gamesPlayed;
    const goalDifference = (team?.won || 0) - (team?.lost || 0);
    const goalDifferencePerGame = goalDifference / gamesPlayed;

    return pointsPerGame * 0.7 + goalDifferencePerGame * 0.3;
  }

  private isDerbyMatch(homeTeam: any, awayTeam: any): boolean {
    // This is a simplified implementation. In reality, you'd need a predefined list of derby matches.
    // For demonstration, let's consider teams with codes that are close to each other as local rivals.
    const codeDifference = Math.abs(
      (homeTeam?.code || 0) - (awayTeam?.code || 0)
    );
    return codeDifference <= 3; // Arbitrary threshold
  }

  private getActualResult(fixture: any): string {
    if (fixture.homeGoals > fixture.awayGoals) return "H";
    if (fixture.homeGoals < fixture.awayGoals) return "A";
    return "D";
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
    return (
      recentGames.reduce((sum, game) => sum + (game.total_points || 0), 0) /
      recentGames.length
    );
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
    const points = history.map((game) => game.total_points || 0);
    const mean =
      points.reduce((sum, points) => sum + points, 0) / points.length;
    const squaredDiffs = points.map((points) => Math.pow(points - mean, 2));
    return Math.sqrt(
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / points.length
    );
  }

  // Helper function implementations

  private calculateHomeAwayDelta(history: any[]): number {
    const homePerformance = history
      .filter((game) => game.was_home)
      .reduce((sum, game) => sum + game.total_points, 0);
    const awayPerformance = history
      .filter((game) => !game.was_home)
      .reduce((sum, game) => sum + game.total_points, 0);
    const homeGames = history.filter((game) => game.was_home).length;
    const awayGames = history.filter((game) => !game.was_home).length;

    const homeAvg = homePerformance / (homeGames || 1);
    const awayAvg = awayPerformance / (awayGames || 1);

    return homeAvg - awayAvg;
  }

  private calculateFormTrend(currentSeason: any[]): number {
    const recentGames = currentSeason.slice(-5); // Consider last 5 games
    const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // More recent games have higher weights

    return recentGames.reduce((trend, game, index) => {
      return trend + game.total_points * weights[index];
    }, 0);
  }

  private calculateSeasonImprovement(
    lastSeason: any[],
    currentSeason: any[]
  ): number {
    const lastSeasonAvg =
      lastSeason.reduce((sum, game) => sum + game.total_points, 0) /
      (lastSeason.length || 1);
    const currentSeasonAvg =
      currentSeason.reduce((sum, game) => sum + game.total_points, 0) /
      (currentSeason.length || 1);

    return ((currentSeasonAvg - lastSeasonAvg) / lastSeasonAvg) * 100; // Percentage improvement
  }

  private calculateInjuryProneness(history: any[]): number {
    const injuryGames = history.filter((game) => game.minutes === 0).length;
    return (injuryGames / history.length) * 100; // Percentage of games missed
  }

  private calculatePriceChangeResilience(history: any[]): number {
    let priceChanges = 0;
    let performanceChanges = 0;

    for (let i = 1; i < history.length; i++) {
      const priceDiff = history[i].value - history[i - 1].value;
      const performanceDiff =
        history[i].total_points - history[i - 1].total_points;

      if (priceDiff !== 0) {
        priceChanges++;
        performanceChanges += Math.abs(performanceDiff);
      }
    }

    return priceChanges === 0 ? 0 : performanceChanges / priceChanges;
  }

  private calculateTeamImpact(history: any[]): number {
    return (
      history.reduce((impact, game) => {
        const teamScore = game.team_h_score + game.team_a_score;
        return impact + (game.goals_scored + game.assists) / (teamScore || 1);
      }, 0) / history.length
    );
  }

  private adjustPerformanceForDifficulty(history: any[]): number {
    return (
      history.reduce((adjustedPerformance, game) => {
        // Assume difficulty is on a scale of 1-5, where 5 is most difficult
        const difficultyFactor = game.difficulty / 3; // Normalize to make 3 the baseline
        return adjustedPerformance + game.total_points * difficultyFactor;
      }, 0) / history.length
    );
  }

  /**
   * Calculates the average difficulty of the next 5 upcoming fixtures.
   *
   * @param fixtures - An array of fixture objects.
   * @returns The average difficulty of the next 5 upcoming fixtures.
   */
  private calculateUpcomingFixtureDifficulty(
    fixtures: any[] | undefined
  ): number {
    if (!fixtures || fixtures.length === 0) {
      return 0;
    }
    return (
      fixtures
        .slice(0, 5)
        .reduce((sum, fixture) => sum + (fixture.difficulty || 0), 0) / 5
    );
  }
}
