import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { useEffect, useId, useRef, useState } from 'react';
import type { Signal } from '@preact-signals/safe-react';

export default function FormItemBoolean({
  id,
  className,
  valueSignal,
  ...props
}: { id: string; className?: string; valueSignal: Signal<boolean> } & React.ComponentProps<typeof Checkbox>) {
  const labelId = useId();
  const dispose = useRef<() => void>(undefined);
  const [value, setValue] = useState(false);

  useEffect(() => {
    dispose.current?.();
    dispose.current = valueSignal.subscribe((v) => setValue(v));
  }, [valueSignal]);

  return (
    <div className={cn('flex w-full flex-col', className)}>
      <Label htmlFor={labelId} className="mb-3">
        {id}
      </Label>
      <Checkbox
        checked={value}
        onCheckedChange={(v) => {
          valueSignal.value = v == 'indeterminate' ? false : v;
        }}
        id={labelId}
        {...props}
      />
    </div>
  );
}
