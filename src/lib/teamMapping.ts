export const PIPELINE_TEAM_IDS = {
  EQUIPE_7: 'team-equipe-7',
  TROPA_DE_ELITE: 'team-tropa-de-elite',
} as const;

export const AGENDA_TEAM_IDS = {
  EQUIPE_7: 'ac2c282a-54a6-491e-b133-90890e2d299d',
  TROPA_DE_ELITE: '5090ad67-315d-45f5-b4b2-5a1a73ae201d',
} as const;

export function mapPipelineTeamToAgenda(teamId?: string | null) {
  switch (teamId) {
    case PIPELINE_TEAM_IDS.EQUIPE_7:
      return AGENDA_TEAM_IDS.EQUIPE_7;
    case PIPELINE_TEAM_IDS.TROPA_DE_ELITE:
      return AGENDA_TEAM_IDS.TROPA_DE_ELITE;
    default:
      return null;
  }
}

export function mapAgendaTeamToPipeline(teamId?: string | null) {
  switch (teamId) {
    case AGENDA_TEAM_IDS.EQUIPE_7:
      return PIPELINE_TEAM_IDS.EQUIPE_7;
    case AGENDA_TEAM_IDS.TROPA_DE_ELITE:
      return PIPELINE_TEAM_IDS.TROPA_DE_ELITE;
    default:
      return null;
  }
}
