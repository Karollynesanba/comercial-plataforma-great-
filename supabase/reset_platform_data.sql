begin;

truncate table
  public.activity_logs,
  public.ad_creatives,
  public.agenda_events,
  public.agendamento_leads,
  public.championship_events,
  public.championship_monthly_history,
  public.championship_teams,
  public.client_activity_tracking,
  public.client_files,
  public.client_start_form_responses,
  public.commercial_goals,
  public.commercial_settings,
  public.crm_events,
  public.exec_comments,
  public.exec_cards,
  public.exec_views,
  public.expenses,
  public.finance_simulations,
  public.meeting_action_items,
  public.meetings,
  public.my_day_items,
  public.notifications,
  public.operational_clients,
  public.payment_reminders,
  public.pipeline_clients,
  public.project_deliverables,
  public.project_goals,
  public.project_phases,
  public.project_risks,
  public.project_updates,
  public.projects,
  public.sdr_goals,
  public.strategic_decisions,
  public.strategic_tasks,
  public.tech_deployments,
  public.tech_tasks,
  public.whatsapp_reminder_logs,
  public.work_items
restart identity cascade;

delete from public.criativos;

commit;
