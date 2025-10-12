import { cn } from '@/lib/utils';
import { Signal } from '@preact-signals/safe-react';
import { useState, useEffect, useRef, useId } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function FormItemString({
  id,
  valueSignal,
  onKeyDown,
  className,
  placeholder,
}: {
  id: string;
  valueSignal: Signal<string>;
  onKeyDown?: (value: string) => void;
  className?: string;
} & React.ComponentProps<typeof Input>) {
  const [value, setValue] = useState('');
  const dispose = useRef<() => void>(undefined);
  const labelId = useId();

  useEffect(() => {
    dispose.current?.();
    dispose.current = valueSignal.subscribe((v) => setValue(v));
  }, [valueSignal]);

  return (
    <div className={cn('flex flex-col mt-2', className)}>
      <Label htmlFor={labelId} className="mb-2">
        {id}
      </Label>
      <Input
        type="text"
        id={labelId}
        value={value}
        placeholder={placeholder}
        onChange={(e) => (valueSignal.value = e.target.value)}
        onBlur={() => {
          if (value != valueSignal.peek()) onKeyDown?.(value);
        }}
        onKeyDown={(e) => {
          if (e.key != 'Enter') return;
          onKeyDown?.(value);
        }}
      />
    </div>
  );
}
