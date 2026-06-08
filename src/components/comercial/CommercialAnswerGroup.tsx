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
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((option) => {
        const optionId = `${name}-${option.value}`;

        return (
          <div key={option.value} className="relative">
            <RadioGroupItem id={optionId} value={option.value} className="peer sr-only" />
            <Label
              htmlFor={optionId}
              className={cn(
                'inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
                'peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 peer-data-[state=checked]:text-red-700 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-red-500/15'
              )}
            >
              <span className="mr-2 h-2.5 w-2.5 rounded-full bg-slate-300 ring-2 ring-white" />
              {option.label}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
