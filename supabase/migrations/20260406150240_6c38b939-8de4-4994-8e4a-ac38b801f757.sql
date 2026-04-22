
CREATE TABLE public.client_start_form_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.operational_clients(id) ON DELETE CASCADE,
  nome_empresa TEXT,
  responsavel_projeto TEXT,
  endereco TEXT,
  instagram_login TEXT,
  facebook_login TEXT,
  numero_campanha TEXT,
  produtos_servicos TEXT,
  produto_resultado TEXT,
  ticket_medio TEXT,
  tabela_servicos TEXT,
  valor_meta_ads TEXT,
  valores_diretos_artes TEXT,
  publico_alvo TEXT,
  idade_media TEXT,
  classe_social TEXT,
  interesses_publico TEXT,
  concorrentes_instagram TEXT,
  possui_identidade_visual TEXT,
  arquivos_identidade TEXT,
  cores_marca TEXT,
  preferencia_tipografia TEXT,
  info_adicional TEXT,
  restricao_comunicacao TEXT,
  submitted_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_start_form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view form responses"
ON public.client_start_form_responses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert form responses"
ON public.client_start_form_responses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update form responses"
ON public.client_start_form_responses FOR UPDATE TO authenticated USING (true);
