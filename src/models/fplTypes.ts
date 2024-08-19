// Define types for the FPL API responses
export interface BootstrapStatic {
    events: any[];
    game_settings: any;
    phases: any[];
    teams: any[];
    total_players: number;
    elements: any[];
    element_stats: any[];
    element_types: any[];
  }
  
  export interface Fixture {
    id: number;
    event: number;
    finished: boolean;
    team_h: number;
    team_a: number;
  }
  
  export interface PlayerSummary {
    fixtures: any[];
    history: any[];
    history_past: any[];
  }
  
  export interface GameweekLive {
    elements: any[];
  }