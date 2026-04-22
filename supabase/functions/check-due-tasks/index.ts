import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Find tasks that:
    // 1. Have a due date
    // 2. Are not completed (completed_at is null)
    // 3. Have an assignee
    // 4. Due date is within 24-48 hours from now

    // Format dates for Supabase query
    const todayStr = now.toISOString().split('T')[0];
    const oneDayStr = oneDayFromNow.toISOString().split('T')[0];
    const twoDaysStr = twoDaysFromNow.toISOString().split('T')[0];

    console.log(`Checking for tasks due between ${oneDayStr} and ${twoDaysStr}`);

    // Get tasks due in 24-48 hours (warning)
    const { data: warningTasks, error: warningError } = await supabase
      .from('exec_cards')
      .select('id, title, due_date, assigned_to_user_id, board_id')
      .gte('due_date', oneDayStr)
      .lt('due_date', twoDaysStr)
      .is('completed_at', null)
      .not('assigned_to_user_id', 'is', null)
      .not('due_date', 'is', null);

    if (warningError) {
      console.error('Error fetching warning tasks:', warningError);
      throw warningError;
    }

    console.log(`Found ${warningTasks?.length || 0} tasks due in 24-48 hours`);

    // Get tasks due today or overdue
    const { data: urgentTasks, error: urgentError } = await supabase
      .from('exec_cards')
      .select('id, title, due_date, assigned_to_user_id, board_id')
      .lte('due_date', oneDayStr)
      .is('completed_at', null)
      .not('assigned_to_user_id', 'is', null)
      .not('due_date', 'is', null);

    if (urgentError) {
      console.error('Error fetching urgent tasks:', urgentError);
      throw urgentError;
    }

    console.log(`Found ${urgentTasks?.length || 0} tasks due today or overdue`);

    // Check for existing notifications to avoid duplicates (last 24 hours)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentNotifications } = await supabase
      .from('notifications')
      .select('related_entity_id, type')
      .in('type', ['TASK_DUE_SOON', 'TASK_OVERDUE'])
      .gte('created_at', yesterday);

    const recentNotifMap = new Map<string, Set<string>>();
    recentNotifications?.forEach((n) => {
      if (!recentNotifMap.has(n.related_entity_id)) {
        recentNotifMap.set(n.related_entity_id, new Set());
      }
      recentNotifMap.get(n.related_entity_id)?.add(n.type);
    });

    const notificationsToCreate: Array<{
      user_id: string;
      title: string;
      message: string;
      type: string;
      related_entity: string;
      related_entity_id: string;
    }> = [];

    // Create warning notifications (24-48 hours)
    for (const task of warningTasks || []) {
      const existingTypes = recentNotifMap.get(task.id);
      if (!existingTypes?.has('TASK_DUE_SOON')) {
        notificationsToCreate.push({
          user_id: task.assigned_to_user_id,
          title: '⏰ Tarefa vence em breve',
          message: `A tarefa "${task.title}" vence em ${task.due_date}. Não se esqueça de concluí-la!`,
          type: 'TASK_DUE_SOON',
          related_entity: 'exec_cards',
          related_entity_id: task.id,
        });
      }
    }

    // Create urgent notifications (today or overdue)
    for (const task of urgentTasks || []) {
      const existingTypes = recentNotifMap.get(task.id);
      if (!existingTypes?.has('TASK_OVERDUE')) {
        const dueDate = new Date(task.due_date);
        const isOverdue = dueDate < now;
        
        notificationsToCreate.push({
          user_id: task.assigned_to_user_id,
          title: isOverdue ? '🚨 Tarefa atrasada!' : '⚠️ Tarefa vence hoje',
          message: isOverdue 
            ? `A tarefa "${task.title}" está atrasada! Era para entregar em ${task.due_date}.`
            : `A tarefa "${task.title}" vence hoje (${task.due_date}). Finalize o mais rápido possível!`,
          type: 'TASK_OVERDUE',
          related_entity: 'exec_cards',
          related_entity_id: task.id,
        });
      }
    }

    console.log(`Creating ${notificationsToCreate.length} new notifications`);

    // Insert notifications
    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        warningTasksCount: warningTasks?.length || 0,
        urgentTasksCount: urgentTasks?.length || 0,
        notificationsCreated: notificationsToCreate.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-due-tasks function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
