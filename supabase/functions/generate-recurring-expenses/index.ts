import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Expense {
  id: string;
  category_id: string | null;
  description: string;
  amount: number;
  expense_date: string;
  recurrence: string | null;
  notes: string | null;
  created_by_user_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const targetDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    
    // Calculate end of month for checking existing expenses
    const endOfMonth = new Date(currentYear, currentMonth, 0);
    const endOfMonthStr = endOfMonth.toISOString().split("T")[0];

    console.log(`[generate-recurring-expenses] Starting for period: ${targetDate} to ${endOfMonthStr}`);

    // Fetch all recurring expenses (MENSAL, TRIMESTRAL, ANUAL)
    const { data: recurringExpenses, error: fetchError } = await supabase
      .from("expenses")
      .select("*")
      .neq("recurrence", "UNICO");

    if (fetchError) {
      console.error("[generate-recurring-expenses] Error fetching recurring expenses:", fetchError);
      throw fetchError;
    }

    if (!recurringExpenses || recurringExpenses.length === 0) {
      console.log("[generate-recurring-expenses] No recurring expenses found");
      return new Response(
        JSON.stringify({ success: true, message: "No recurring expenses to generate", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-recurring-expenses] Found ${recurringExpenses.length} recurring expense templates`);

    // Check which expenses already exist for this month
    const { data: existingExpenses, error: existingError } = await supabase
      .from("expenses")
      .select("description, category_id, recurrence")
      .gte("expense_date", targetDate)
      .lte("expense_date", endOfMonthStr);

    if (existingError) {
      console.error("[generate-recurring-expenses] Error checking existing expenses:", existingError);
      throw existingError;
    }

    // Create a set of existing expense keys to avoid duplicates
    const existingKeys = new Set(
      existingExpenses?.map((e) => `${e.description}-${e.category_id}-${e.recurrence}`) || []
    );

    console.log(`[generate-recurring-expenses] Found ${existingKeys.size} existing expenses for this month`);

    // Filter recurring expenses based on their recurrence type
    const toCreate: Omit<Expense, "id">[] = [];

    for (const expense of recurringExpenses as Expense[]) {
      const key = `${expense.description}-${expense.category_id}-${expense.recurrence}`;
      
      // Skip if already exists this month
      if (existingKeys.has(key)) {
        console.log(`[generate-recurring-expenses] Skipping (already exists): ${expense.description}`);
        continue;
      }

      // Check recurrence type
      if (expense.recurrence === "MENSAL") {
        // Monthly - always create
        toCreate.push({
          category_id: expense.category_id,
          description: expense.description,
          amount: expense.amount,
          expense_date: targetDate,
          recurrence: expense.recurrence,
          notes: `Gerado automaticamente (recorrência mensal)`,
          created_by_user_id: expense.created_by_user_id,
        });
      } else if (expense.recurrence === "TRIMESTRAL") {
        // Quarterly - create every 3 months (Jan, Apr, Jul, Oct)
        const quarterlyMonths = [1, 4, 7, 10];
        if (quarterlyMonths.includes(currentMonth)) {
          toCreate.push({
            category_id: expense.category_id,
            description: expense.description,
            amount: expense.amount,
            expense_date: targetDate,
            recurrence: expense.recurrence,
            notes: `Gerado automaticamente (recorrência trimestral)`,
            created_by_user_id: expense.created_by_user_id,
          });
        }
      } else if (expense.recurrence === "ANUAL") {
        // Annual - create only in January
        if (currentMonth === 1) {
          toCreate.push({
            category_id: expense.category_id,
            description: expense.description,
            amount: expense.amount,
            expense_date: targetDate,
            recurrence: expense.recurrence,
            notes: `Gerado automaticamente (recorrência anual)`,
            created_by_user_id: expense.created_by_user_id,
          });
        }
      }
    }

    if (toCreate.length === 0) {
      console.log("[generate-recurring-expenses] No new expenses to create");
      return new Response(
        JSON.stringify({ success: true, message: "All recurring expenses already generated", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-recurring-expenses] Creating ${toCreate.length} new expenses`);

    // Insert new expenses
    const { data: createdExpenses, error: insertError } = await supabase
      .from("expenses")
      .insert(toCreate)
      .select();

    if (insertError) {
      console.error("[generate-recurring-expenses] Error inserting expenses:", insertError);
      throw insertError;
    }

    console.log(`[generate-recurring-expenses] Successfully created ${createdExpenses?.length || 0} expenses`);

    // Log the activity
    await supabase.from("activity_logs").insert({
      action: "GENERATE_RECURRING_EXPENSES",
      entity: "expenses",
      entity_id: null,
      user_id: "00000000-0000-0000-0000-000000000000", // System user
      user_email: "system@greatagencia.com",
      user_name: "Sistema Automático",
      details: `Geradas ${createdExpenses?.length || 0} despesas recorrentes para ${targetDate}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${createdExpenses?.length || 0} recurring expenses`,
        created: createdExpenses?.length || 0,
        expenses: createdExpenses?.map((e) => ({ description: e.description, amount: e.amount })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[generate-recurring-expenses] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
