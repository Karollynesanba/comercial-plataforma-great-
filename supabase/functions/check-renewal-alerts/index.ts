import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OperationalClient {
  id: string;
  client_name: string;
  status_operacional: string;
  renewal_date: string | null;
  renewal_due_date: string | null; // The date when renewal is due (for automatic monitoring)
  renewal_status: string | null;
  churn_status: string | null;
  deal_value: number | null;
  team_id: string | null;
  assigned_gestor_id: string | null;
  assigned_atendente_id: string | null;
  created_at: string;
  plan: string | null;
}

interface Profile {
  id: string;
  operational_role: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Get active clients
    const { data: clients, error: clientsError } = await supabase
      .from('operational_clients')
      .select('*')
      .in('status_operacional', ['ATIVO', 'ONBOARDING'])
      .is('churn_status', null);
    
    if (clientsError) {
      throw new Error(`Error fetching clients: ${clientsError.message}`);
    }
    
    // Get coordinators to notify
    const { data: coordinators, error: coordError } = await supabase
      .from('profiles')
      .select('id, operational_role')
      .eq('operational_role', 'COORDENADOR_RED')
      .eq('is_active', true);
    
    if (coordError) {
      console.error('Error fetching coordinators:', coordError);
    }
    
    const notifications: Array<{
      user_id: string;
      title: string;
      message: string;
      type: string;
      related_entity: string;
      related_entity_id: string;
    }> = [];
    
    for (const client of (clients || []) as OperationalClient[]) {
      const usersToNotify: string[] = [];
      
      // Add assigned users
      if (client.assigned_gestor_id) usersToNotify.push(client.assigned_gestor_id);
      if (client.assigned_atendente_id) usersToNotify.push(client.assigned_atendente_id);
      
      // Add coordinators
      if (coordinators) {
        coordinators.forEach((c: Profile) => {
          if (!usersToNotify.includes(c.id)) {
            usersToNotify.push(c.id);
          }
        });
      }
      
      // Check renewal date proximity - prefer renewal_due_date, fallback to renewal_date
      const renewalDateStr = client.renewal_due_date || client.renewal_date;
      if (renewalDateStr && client.renewal_status !== 'RENOVADO') {
        const renewalDate = new Date(renewalDateStr);
        
        // Calculate days until renewal
        const daysUntilRenewal = Math.ceil(
          (renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        
        if (daysUntilRenewal <= 0 && daysUntilRenewal >= -7) {
          // Renewal date passed (urgent)
          for (const userId of usersToNotify) {
            notifications.push({
              user_id: userId,
              title: '🚨 Renovação vencida!',
              message: `O cliente "${client.client_name}" está com a renovação vencida há ${Math.abs(daysUntilRenewal)} dia(s). Ação imediata necessária!`,
              type: 'RENEWAL_OVERDUE',
              related_entity: 'operational_clients',
              related_entity_id: client.id,
            });
          }
        } else if (daysUntilRenewal > 0 && daysUntilRenewal <= 7) {
          // Renewal in 7 days or less
          for (const userId of usersToNotify) {
            notifications.push({
              user_id: userId,
              title: '⚠️ Renovação em breve',
              message: `O cliente "${client.client_name}" renova em ${daysUntilRenewal} dia(s). Prepare-se para a renovação!`,
              type: 'RENEWAL_SOON',
              related_entity: 'operational_clients',
              related_entity_id: client.id,
            });
          }
        } else if (daysUntilRenewal > 7 && daysUntilRenewal <= 14) {
          // Renewal in 14 days
          for (const userId of usersToNotify) {
            notifications.push({
              user_id: userId,
              title: '📅 Renovação próxima',
              message: `O cliente "${client.client_name}" renova em ${daysUntilRenewal} dias. Comece a preparar a renovação.`,
              type: 'RENEWAL_APPROACHING',
              related_entity: 'operational_clients',
              related_entity_id: client.id,
            });
          }
        } else if (daysUntilRenewal > 14 && daysUntilRenewal <= 30) {
          // Renewal in 30 days (only notify coordinators)
          const coordIds = (coordinators || []).map((c: Profile) => c.id);
          for (const userId of coordIds) {
            notifications.push({
              user_id: userId,
              title: '📋 Renovação no radar',
              message: `O cliente "${client.client_name}" renova em ${daysUntilRenewal} dias.`,
              type: 'RENEWAL_REMINDER',
              related_entity: 'operational_clients',
              related_entity_id: client.id,
            });
          }
        }
      }
      
      // Churn risk indicators
      const churnIndicators: string[] = [];
      
      // Indicator 1: Low value client with long tenure (potential dissatisfaction)
      const clientAge = Math.floor(
        (now.getTime() - new Date(client.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)
      );
      if (clientAge > 6 && (client.deal_value || 0) < 1000) {
        churnIndicators.push('Baixo investimento após 6+ meses');
      }
      
      // Indicator 2: Monthly plan (higher churn risk)
      if (client.plan === 'MENSAL' && clientAge > 3) {
        churnIndicators.push('Plano mensal há mais de 3 meses');
      }
      
      // If client has churn indicators, notify
      if (churnIndicators.length > 0) {
        const coordIds = (coordinators || []).map((c: Profile) => c.id);
        for (const userId of coordIds) {
          notifications.push({
            user_id: userId,
            title: '⚡ Risco de churn detectado',
            message: `O cliente "${client.client_name}" apresenta indicadores de risco: ${churnIndicators.join(', ')}.`,
            type: 'CHURN_RISK',
            related_entity: 'operational_clients',
            related_entity_id: client.id,
          });
        }
      }
    }
    
    // Check for existing notifications to avoid duplicates (last 24h)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    
    const uniqueNotifications: typeof notifications = [];
    
    for (const notif of notifications) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', notif.user_id)
        .eq('type', notif.type)
        .eq('related_entity_id', notif.related_entity_id)
        .gte('created_at', yesterday)
        .limit(1);
      
      if (!existing || existing.length === 0) {
        uniqueNotifications.push(notif);
      }
    }
    
    // Insert notifications
    if (uniqueNotifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(uniqueNotifications);
      
      if (insertError) {
        console.error('Error inserting notifications:', insertError);
      }
    }
    
    console.log(`Processed ${clients?.length || 0} clients, created ${uniqueNotifications.length} notifications`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        clientsProcessed: clients?.length || 0,
        notificationsCreated: uniqueNotifications.length 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-renewal-alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
