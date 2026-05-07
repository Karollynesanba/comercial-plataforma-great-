import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { canUseLocalStorage } from '@/lib/safeStorage';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { Eye, EyeOff, Mail, Lock, AlertCircle, User } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  const { login, signUp, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  const storageAvailable = useMemo(() => canUseLocalStorage(), []);

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      navigate('/comercial/dashboard');
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (mode === 'login') {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Erro ao fazer login.');
      } else {
        navigate('/comercial/dashboards', { replace: true });
      }
    } else {
      if (!name.trim()) {
        setError('Por favor, informe seu nome.');
        setIsSubmitting(false);
        return;
      }
      const result = await signUp(email, password, name);
      if (!result.success) {
        setError(result.error || 'Erro ao criar conta.');
      } else {
        navigate('/comercial/dashboards', { replace: true });
      }
    }
    
    setIsSubmitting(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
  };

  const formVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  const featureVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.6 + i * 0.1,
        duration: 0.4,
        ease: "easeOut" as const,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Background gradient */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
        
        {/* Animated shapes */}
        <motion.div 
          className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        />
        <motion.div 
          className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        
        {/* Content */}
        <motion.div 
          className="relative z-10 flex flex-col justify-center px-12 xl:px-20"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Logo variant="full" size="xl" className="mb-12" />
          </motion.div>
          
          <motion.h1 
            className="text-4xl xl:text-5xl font-bold leading-tight mb-4"
            variants={itemVariants}
          >
            Centro de comando da Great
          </motion.h1>
          
          <motion.p 
            className="text-xl text-primary font-semibold mb-6"
            variants={itemVariants}
          >
            Aqui a performance Ã© padrÃ£o, nÃ£o exceÃ§Ã£o
          </motion.p>
          
          <motion.p 
            className="text-base text-muted-foreground max-w-lg mb-8"
            variants={itemVariants}
          >
            Este Ã© o ambiente interno onde a Great opera, executa e escala.
            Metas claras, processos definidos e responsabilidade individual por resultados.
          </motion.p>

          {/* Features */}
          <div className="space-y-3">
            {[
              'Metas acompanhadas em tempo real',
              'Clientes sob controle absoluto',
              'ExecuÃ§Ã£o diÃ¡ria com padrÃ£o operacional',
              'Performance individual visÃ­vel e mensurÃ¡vel',
            ].map((feature, index) => (
              <motion.div 
                key={feature} 
                className="flex items-center gap-3 text-sm text-muted-foreground"
                custom={index}
                variants={featureVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                {feature}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Watermark */}
        <motion.div 
          className="absolute bottom-8 left-12 opacity-5"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <Logo variant="mark" size="xl" className="w-48 h-48" />
        </motion.div>
      </div>

      {/* Right side - Login form */}
      <motion.div 
        className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8"
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <motion.div 
            className="lg:hidden flex justify-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Logo variant="full" size="lg" />
          </motion.div>

          <motion.div 
            className="glass rounded-2xl p-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold mb-2">
                {mode === 'login' ? 'Acesse sua conta' : 'Criar conta'}
              </h2>
              <p className="text-muted-foreground">
                {mode === 'login' ? 'Entre com suas credenciais' : 'Preencha os dados abaixo'}
              </p>
            </motion.div>

            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              {!storageAvailable && (
                <motion.div
                  className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Seu navegador estÃ¡ bloqueando o armazenamento do site.</p>
                    <p className="text-xs text-destructive/90">
                      Isso impede manter a sessÃ£o e pode causar logout automÃ¡tico. Desative modo anÃ´nimo/privado,
                      extensÃµes de bloqueio (AdBlock/Brave Shield) e permita cookies/dados do site.
                    </p>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div 
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              {!isSupabaseConfigured && mode === 'signup' && (
                <motion.div
                  className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Cadastro indisponível neste ambiente.</p>
                    <p className="text-xs text-muted-foreground">
                      O login interno já funciona com os acessos cadastrados, mas para criar conta o Supabase precisa estar configurado.
                    </p>
                  </div>
                </motion.div>
              )}

              {mode === 'signup' && (
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.42 }}
                >
                  <Label htmlFor="name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required={mode === 'signup'}
                    />
                  </div>
                </motion.div>
              )}

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.45 }}
              >
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="text-xs text-muted-foreground">MÃ­nimo de 6 caracteres</p>
                )}
              </motion.div>

              {mode === 'login' && (
                <motion.div 
                  className="flex items-center justify-between text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.55 }}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-border" />
                    <span className="text-muted-foreground">Lembrar-me</span>
                  </label>
                  <a href="#" className="text-primary hover:underline">
                    Esqueceu a senha?
                  </a>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
            <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
            </>
                  ) : (
                    mode === 'login' ? 'Entrar' : 'Criar conta'
                  )}
                </Button>
              </motion.div>

              <motion.div
                className="text-center text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.65 }}
              >
                {mode === 'login' ? (
                  <p className="text-muted-foreground">
                    NÃ£o tem uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); setError(''); }}
                      className="text-primary hover:underline font-medium"
                    >
                      Criar conta
                    </button>
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    JÃ¡ tem uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(''); }}
                      className="text-primary hover:underline font-medium"
                    >
                      Fazer login
                    </button>
                  </p>
                )}
              </motion.div>
            </motion.form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
