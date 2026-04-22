import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, format, addDays, isBefore, isToday } from 'date-fns';

// Column names that should be treated as "done" and excluded from overdue checks
// (keep multiple variants to avoid issues with accents/singular-plural)
const DONE_COLUMN_NAMES = [
  'FEITO',
  'SUBIR ANÚNCIO',
  'SUBIR ANUNCIO',
  'SUBIR ANÚNCIOS',
  'SUBIR ANUNCIOS',
];

export interface OverdueTask {
  id: string;
  title: string;
  due_date: string;
  board_id: string;
  column_id: string;
  priority: string;
  assigned_to_user_id: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean; // Due in next 24-48 hours
}

export function useOverdueTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['overdue-tasks', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const now = new Date();
      const today = startOfDay(now);
      const twoDaysFromNow = addDays(today, 2);
      const todayStr = format(today, 'yyyy-MM-dd');
      const twoDaysStr = format(twoDaysFromNow, 'yyyy-MM-dd');

      // First, get all columns that are considered "done"
      const { data: doneColumns } = await supabase
        .from('exec_columns')
        .select('id, name')
        .in('name', DONE_COLUMN_NAMES);

      const doneColumnIds = new Set((doneColumns || []).map(c => c.id));

      // Fetch all uncompleted tasks with due dates up to 2 days from now
      const { data, error } = await supabase
        .from('exec_cards')
        .select('id, title, due_date, board_id, column_id, priority, assigned_to_user_id')
        .lte('due_date', twoDaysStr)
        .is('completed_at', null)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Filter out cards that are in "done" columns
      const filteredData = (data || []).filter(task => !doneColumnIds.has(task.column_id));

      const tasks: OverdueTask[] = filteredData.map(task => {
        const dueDate = new Date(task.due_date);
        const dueDateStart = startOfDay(dueDate);
        
        return {
          ...task,
          isOverdue: isBefore(dueDateStart, today),
          isDueToday: isToday(dueDate),
          isDueSoon: !isBefore(dueDateStart, today) && !isToday(dueDate), // between tomorrow and 2 days
        };
      });

      // Return only tasks that are overdue, due today, or due soon
      return tasks.filter(t => t.isOverdue || t.isDueToday || t.isDueSoon);
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
}

export function useMyOverdueTasks() {
  const { user } = useAuth();
  const { data: allTasks = [], ...rest } = useOverdueTasks();

  // Filter to only show tasks assigned to current user
  const myTasks = allTasks.filter(
    task => task.assigned_to_user_id === user?.id
  );

  return { data: myTasks, ...rest };
}
