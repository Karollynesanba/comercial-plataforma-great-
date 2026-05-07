import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { CommercialAnswerOption } from '@/lib/commercialAnswer';

interface CommercialAnswerGroupProps {
  name: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: readonly CommercialAnswerOption[];
  className?: string;
}

export function CommercialAnswerGroup({ name, value, onValueChange, options, className }: CommercialAnswerGroupProps) {
  return (
    <RadioGroup
      name={name}
      value={value}
      onValueChange={onValueChange}
      className={cn('grid gap-2', className)}
    >
      {options.map((option) => {
        const optionId = `${name}-${option.value}`;

        return (
          <div key={option.value} className="relative">
            <RadioGroupItem id={optionId} value={option.value} className="peer sr-only" />
            <Label
              htmlFor={optionId}
              className={cn(
                'flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-accent',
                'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
              )}
            >
              {option.label}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
