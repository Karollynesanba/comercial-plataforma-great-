import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MINIMUM_ARTS_PER_WEEK = 3;
const NOTIFICATION_ROLES = ['ADMIN', 'COORDENADOR_RED', 'EQUIPE_DESIGN', 'DESIGN'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Calculate current week of month (1-4)
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const dayOfMonth = now.getDate();
    const currentWeek = Math.min(Math.ceil(dayOfMonth / 7), 4);
    
    // Check if we're near end of week (Thursday = 4, Friday = 5, Saturday = 6)
    const dayOfWeek = now.getDay();
    const isNearEndOfWeek = dayOfWeek >= 4 || dayOfWeek === 0; // Thu, Fri, Sat, Sun

    console.log(`Checking arts for year ${currentYear}, month ${currentMonth}, week ${currentWeek}`);
    console.log(`Day of week: ${dayOfWeek}, Is near end of week: ${isNearEndOfWeek}`);

    // Get all active operational clients
    const { data: clients, error: clientsError } = await supabase
      .from('operational_clients')
      .select('id, client_name, clinic_name')
      .eq('status_operacional', 'ativo');

    if (clientsError) {
      throw new Error(`Error fetching clients: ${clientsError.message}`);
    }

    // Get activity tracking for current week
    const { data: activities, error: activitiesError } = await supabase
      .from('client_activity_tracking')
      .select('client_id, artes_count, designer_name')
      .eq('year', currentYear)
      .eq('month', currentMonth)
      .eq('week', currentWeek);

    if (activitiesError) {
      throw new Error(`Error fetching activities: ${activitiesError.message}`);
    }

    // Calculate total arts per client for this week
    const clientArtsTotals: Record<string, number> = {};
    (activities || []).forEach(activity => {
      if (!clientArtsTotals[activity.client_id]) {
        clientArtsTotals[activity.client_id] = 0;
      }
      clientArtsTotals[activity.client_id] += activity.artes_count || 0;
    });

    // Find clients with insufficient arts
    const insufficientClients = (clients || []).filter(client => {
      const totalArts = clientArtsTotals[client.id] || 0;
      return totalArts < MINIMUM_ARTS_PER_WEEK;
    }).map(client => ({
      ...client,
      totalArts: clientArtsTotals[client.id] || 0
    }));

    console.log(`Found ${insufficientClients.length} clients with insufficient arts`);

    if (insufficientClients.length === 0) {
      return new Response(
        JSON.stringify({ message: "All clients have sufficient arts", checked: clients?.length || 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get users to notify (admins, coordinators, design team)
    const { data: usersToNotify, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, operational_role')
      .eq('is_active', true)
      .or(`operational_role.in.(${NOTIFICATION_ROLES.filter(r => r !== 'ADMIN').join(',')})`);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    // Also get admin users from user_roles table
    const { data: adminRoles, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      throw new Error(`Error fetching admin roles: ${adminError.message}`);
    }

    const adminUserIds = (adminRoles || []).map(r => r.user_id);
    const operationalUserIds = (usersToNotify || []).map(u => u.id);
    const allUserIds = [...new Set([...adminUserIds, ...operationalUserIds])];

    console.log(`Will notify ${allUserIds.length} users`);

    // Create notifications for each insufficient client
    const notifications: any[] = [];
    
    for (const client of insufficientClients) {
      const clientDisplayName = client.clinic_name || client.client_name;
      const artsNeeded = MINIMUM_ARTS_PER_WEEK - client.totalArts;
      
      for (const userId of allUserIds) {
        notifications.push({
          user_id: userId,
          title: '⚠️ Artes Insuficientes - Urgente!',
          message: `${clientDisplayName} está com apenas ${client.totalArts} arte(s) na semana ${currentWeek}. Faltam ${artsNeeded} arte(s) para atingir o mínimo. Dê foco total em resolver isso!`,
          type: 'URGENT_ARTS_ALERT',
          related_entity: 'operational_clients',
          related_entity_id: client.id,
          read: false,
        });
      }
    }

    // Insert notifications in batches
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        throw new Error(`Error inserting notifications: ${insertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Notifications sent successfully",
        clientsWithInsufficientArts: insufficientClients.length,
        notificationsSent: notifications.length,
        usersNotified: allUserIds.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in check-insufficient-arts function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
