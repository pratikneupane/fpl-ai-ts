import axios from 'axios';
import { BootstrapStatic, Fixture, PlayerSummary, GameweekLive } from '../models/fplTypes';

const FPL_API_BASE_URL = 'https://fantasy.premierleague.com/api';

/**
 * Provides methods to interact with the Fantasy Premier League (FPL) API.
 */
export class FPLApiService {
  /**
   * Retrieves the static bootstrap data for the Fantasy Premier League (FPL) API.
   * This data includes information such as teams, players, and other static data used by the FPL API.
   * @returns {Promise<BootstrapStatic>} The static bootstrap data from the FPL API.
   */
  static async getBootstrapStatic(): Promise<BootstrapStatic> {
    const response = await axios.get(`${FPL_API_BASE_URL}/bootstrap-static/`);
    return response.data;
  }

  /**
   * Retrieves the list of fixtures for the Fantasy Premier League (FPL).
   * @returns {Promise<Fixture[]>} The list of fixtures from the FPL API.
   */
  static async getFixtures(): Promise<Fixture[]> {
    const response = await axios.get(`${FPL_API_BASE_URL}/fixtures/`);
    return response.data;
  }

  /**
   * Retrieves the player summary data for the specified player ID.
   * @param playerId - The ID of the player to retrieve the summary for.
   * @returns {Promise<PlayerSummary>} The player summary data from the FPL API.
   */
  static async getPlayerSummary(playerId: number): Promise<PlayerSummary> {
    const response = await axios.get(`${FPL_API_BASE_URL}/element-summary/${playerId}/`);
    return response.data;
  }

  /**
   * Retrieves the live data for the specified gameweek in the Fantasy Premier League (FPL).
   * @param gameweek - The gameweek number to retrieve the live data for.
   * @returns {Promise<GameweekLive>} The live data for the specified gameweek from the FPL API.
   */
  static async getGameweekLive(gameweek: number): Promise<GameweekLive> {
    const response = await axios.get(`${FPL_API_BASE_URL}/event/${gameweek}/live/`);
    return response.data;
  }
}