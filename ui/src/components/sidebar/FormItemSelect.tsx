import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { useSignalEffect, type Signal } from '@preact-signals/safe-react';
import { useState } from 'react';

export default function FormItemSelect({
  id,
  items,
  onValueChange,
  valueSignal,
  ...props
}: { id: string; items: string[]; valueSignal?: Signal<string> } & React.ComponentProps<typeof Select>) {
  const [valueState, setValueState] = useState('');

  useSignalEffect(() => {
    if (!valueSignal?.value) return;
    setValueState(valueSignal.value);
  });

  return (
    <div className="flex w-full flex-col">
      <Label className="mb-2">{id}</Label>
      <Select
        {...props}
        value={valueState}
        onValueChange={(v) => {
          if (valueSignal && valueSignal.value != v) {
            valueSignal.value = v;
          }
          setValueState(v);
          onValueChange?.(valueState);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Select ${id}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
