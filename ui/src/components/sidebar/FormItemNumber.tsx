import { cn, roundTo } from '@/lib/utils';
import { Signal } from '@preact-signals/safe-react';
import { useState, useEffect, useRef, useId } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function FormItemNumber({
  id,
  valueSignal,
  onKeyDown,
  className,
  step = 0.01,
  modified,
  onChange,
}: {
  id: string;
  valueSignal: Signal<number>;
  onKeyDown?: (value: number) => void;
  onChange?: (value: number) => void;
  className?: string;
  modified?: Signal<boolean>;
  step?: number;
}) {
  const [value, setValue] = useState(0);
  const dispose = useRef<() => void>(undefined);
  const labelId = useId();

  useEffect(() => {
    dispose.current?.();
    dispose.current = valueSignal.subscribe((v) => setValue(roundTo(v, 2)));
  }, [valueSignal]);

  useEffect(() => {
    onChange?.(value);
  }, [value]);

  return (
    <div className={cn('flex flex-col', className)}>
      <Label htmlFor={labelId} className="mb-2">
        {id}
      </Label>
      <Input
        className={modified?.value ? 'border-warning' : ''}
        type="number"
        step={step}
        lang="en"
        id={labelId}
        value={value}
        onChange={(e) => {
          valueSignal.value = +e.target.value;
        }}
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
