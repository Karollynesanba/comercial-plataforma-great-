import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, Trophy, Sparkles, Star } from 'lucide-react';

interface CelebrationAnimationProps {
  show: boolean;
  onComplete?: () => void;
  type?: 'sale' | 'goal';
  title?: string;
  subtitle?: string;
}

const CONFETTI_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#A855F7', // Purple
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#F97316', // Orange
  '#EC4899', // Pink
];

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  rotation: number;
  size: number;
}

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    size: Math.random() * 8 + 4,
  }));
}

export function CelebrationAnimation({ 
  show, 
  onComplete, 
  type = 'sale',
  title,
  subtitle 
}: CelebrationAnimationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (show) {
      setConfetti(generateConfetti(50));
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  const defaultTitle = type === 'sale' ? '🎉 Venda Fechada!' : '🏆 Meta Batida!';
  const defaultSubtitle = type === 'sale'
    ? 'Parabéns pela conquista!'
    : 'Você alcançou sua meta!';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden">
            {confetti.map((piece) => (
              <motion.div
                key={piece.id}
                initial={{
                  y: -20,
                  x: `${piece.x}vw`,
                  rotate: 0,
                  opacity: 1
                }}
                animate={{
                  y: '110vh',
                  rotate: piece.rotation + 720,
                  opacity: [1, 1, 0.8, 0]
                }}
                transition={{
                  duration: 3 + Math.random(),
                  delay: piece.delay,
                  ease: 'easeIn'
                }}
                style={{
                  position: 'absolute',
                  width: piece.size,
                  height: piece.size * 0.6,
                  backgroundColor: piece.color,
                  borderRadius: '2px',
                }}
              />
            ))}
          </div>

          {/* Sparkle effects around the card */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.2 + i * 0.1,
                  repeat: 2,
                  repeatDelay: 0.5,
                }}
                style={{
                  position: 'absolute',
                  transform: `rotate(${i * 45}deg) translateY(-120px)`,
                }}
              >
                <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
              </motion.div>
            ))}
          </div>

          {/* Main celebration card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{
              scale: [0, 1.1, 1],
              rotate: [-10, 5, 0]
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 15
            }}
            className="relative z-10 bg-gradient-to-br from-surface via-surface-2 to-surface border border-border rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4"
          >
            {/* Animated icon */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, -10, 10, 0]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="mb-4 flex justify-center"
            >
              {type === 'sale' ? (
                <div className="relative">
                  <PartyPopper className="h-16 w-16 text-primary" />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                  </motion.div>
                </div>
              ) : (
                <div className="relative">
                  <Trophy className="h-16 w-16 text-yellow-500" />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                  </motion.div>
                </div>
              )}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-foreground mb-2"
            >
              {title || defaultTitle}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground"
            >
              {subtitle || defaultSubtitle}
            </motion.p>

            {/* Progress bar animation */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 2.5, ease: 'linear' }}
              className="mt-6 h-1 bg-primary/30 rounded-full overflow-hidden origin-left"
            >
              <div className="h-full bg-primary rounded-full" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
