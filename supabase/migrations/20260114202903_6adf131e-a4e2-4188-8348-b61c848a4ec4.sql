
-- Create enum types for study area
DO $$ BEGIN
  CREATE TYPE study_resource_type AS ENUM ('DOCUMENT', 'PDF', 'EBOOK', 'VIDEO', 'LINK', 'TRAINING', 'PLAYBOOK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE study_difficulty AS ENUM ('INICIANTE', 'INTERMEDIARIO', 'AVANCADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE study_visibility AS ENUM ('OPERACIONAL_ONLY', 'COMMERCIAL_ONLY', 'ALL_INTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE study_progress_status AS ENUM ('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE knowledge_scope AS ENUM ('GREAT_GLOBAL', 'CATEGORY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_context_mode AS ENUM ('CATEGORY_FOCUS', 'GREAT_GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_message_role AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Study Categories
CREATE TABLE IF NOT EXISTS public.study_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Study Resources
CREATE TABLE IF NOT EXISTS public.study_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.study_categories(id) ON DELETE CASCADE,
  type study_resource_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  source_url TEXT,
  file_ref TEXT,
  duration_min INTEGER,
  difficulty study_difficulty NOT NULL DEFAULT 'INICIANTE',
  visibility study_visibility NOT NULL DEFAULT 'ALL_INTERNAL',
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Study Collections (Learning Paths)
CREATE TABLE IF NOT EXISTS public.study_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.study_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  resource_ids JSONB DEFAULT '[]'::jsonb,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Study Progress
CREATE TABLE IF NOT EXISTS public.user_study_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.study_resources(id) ON DELETE CASCADE,
  status study_progress_status NOT NULL DEFAULT 'NAO_INICIADO',
  progress_pct INTEGER NOT NULL DEFAULT 0,
  last_access_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  rating INTEGER CHECK (rating >= 0 AND rating <= 5),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_id)
);

-- Study Quizzes
CREATE TABLE IF NOT EXISTS public.study_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.study_categories(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.study_resources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS public.study_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.study_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Knowledge Base Documents (for AI context)
CREATE TABLE IF NOT EXISTS public.knowledge_base_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope knowledge_scope NOT NULL DEFAULT 'CATEGORY',
  category_id UUID REFERENCES public.study_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_resource_id UUID REFERENCES public.study_resources(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Conversations
CREATE TABLE IF NOT EXISTS public.study_ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.study_categories(id) ON DELETE SET NULL,
  context_mode ai_context_mode NOT NULL DEFAULT 'CATEGORY_FOCUS',
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Messages
CREATE TABLE IF NOT EXISTS public.study_ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.study_ai_conversations(id) ON DELETE CASCADE,
  role ai_message_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.study_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_categories
CREATE POLICY "Anyone can view study categories" ON public.study_categories FOR SELECT USING (true);
CREATE POLICY "Coordinators can insert study categories" ON public.study_categories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Coordinators can update study categories" ON public.study_categories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Coordinators can delete study categories" ON public.study_categories FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for study_resources
CREATE POLICY "Anyone can view study resources" ON public.study_resources FOR SELECT USING (true);
CREATE POLICY "Coordinators can insert study resources" ON public.study_resources FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Coordinators can update study resources" ON public.study_resources FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Coordinators can delete study resources" ON public.study_resources FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for study_collections
CREATE POLICY "Anyone can view study collections" ON public.study_collections FOR SELECT USING (true);
CREATE POLICY "Coordinators can insert study collections" ON public.study_collections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Coordinators can update study collections" ON public.study_collections FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Coordinators can delete study collections" ON public.study_collections FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for user_study_progress
CREATE POLICY "Users can view own study progress" ON public.user_study_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coordinators can view all study progress" ON public.user_study_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Users can insert own study progress" ON public.user_study_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study progress" ON public.user_study_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study progress" ON public.user_study_progress FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for study_quizzes
CREATE POLICY "Anyone can view study quizzes" ON public.study_quizzes FOR SELECT USING (true);
CREATE POLICY "Coordinators can insert study quizzes" ON public.study_quizzes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Coordinators can update study quizzes" ON public.study_quizzes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Coordinators can delete study quizzes" ON public.study_quizzes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for study_quiz_attempts
CREATE POLICY "Users can view own quiz attempts" ON public.study_quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz attempts" ON public.study_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for knowledge_base_docs
CREATE POLICY "Anyone can view knowledge docs" ON public.knowledge_base_docs FOR SELECT USING (true);
CREATE POLICY "Coordinators can insert knowledge docs" ON public.knowledge_base_docs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Coordinators can update knowledge docs" ON public.knowledge_base_docs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Coordinators can delete knowledge docs" ON public.knowledge_base_docs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for study_ai_conversations
CREATE POLICY "Users can view own AI conversations" ON public.study_ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI conversations" ON public.study_ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI conversations" ON public.study_ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own AI conversations" ON public.study_ai_conversations FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for study_ai_messages
CREATE POLICY "Users can view own AI messages" ON public.study_ai_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.study_ai_conversations WHERE id = conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own AI messages" ON public.study_ai_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.study_ai_conversations WHERE id = conversation_id AND user_id = auth.uid())
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_study_categories_updated_at ON public.study_categories;
CREATE TRIGGER update_study_categories_updated_at BEFORE UPDATE ON public.study_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_resources_updated_at ON public.study_resources;
CREATE TRIGGER update_study_resources_updated_at BEFORE UPDATE ON public.study_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_study_progress_updated_at ON public.user_study_progress;
CREATE TRIGGER update_user_study_progress_updated_at BEFORE UPDATE ON public.user_study_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_base_docs_updated_at ON public.knowledge_base_docs;
CREATE TRIGGER update_knowledge_base_docs_updated_at BEFORE UPDATE ON public.knowledge_base_docs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_ai_conversations_updated_at ON public.study_ai_conversations;
CREATE TRIGGER update_study_ai_conversations_updated_at BEFORE UPDATE ON public.study_ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for study files
INSERT INTO storage.buckets (id, name, public) VALUES ('study-files', 'study-files', true) ON CONFLICT DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Anyone can view study files" ON storage.objects;
CREATE POLICY "Anyone can view study files" ON storage.objects FOR SELECT USING (bucket_id = 'study-files');

DROP POLICY IF EXISTS "Authenticated users can upload study files" ON storage.objects;
CREATE POLICY "Authenticated users can upload study files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'study-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Coordinators can delete study files" ON storage.objects;
CREATE POLICY "Coordinators can delete study files" ON storage.objects FOR DELETE USING (
  bucket_id = 'study-files' AND 
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED') OR
   has_role(auth.uid(), 'admin'::app_role))
);
