import { Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';
import { Label } from '../ui/label';
import { computed, Signal, useSignalEffect } from '@preact-signals/safe-react';
import { rosclient } from '@/lib/rosclient';
import { selected } from './NodeSelect';

const node_state = computed(() => rosclient.node_states.value.find((ns) => ns.node == selected.value));
const items = computed(() => (node_state.value ? node_state.value.variants : []));

export default function VariationsCombo({
  valueSignal,
  onEmptySubmit,
  onTrashSubmit,
}: {
  valueSignal: Signal<string>;
  onEmptySubmit?: (value: string) => void;
  onTrashSubmit?: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [search, setSearch] = useState('');
  useSignalEffect(() => {
    if (valueSignal.value == value) return;
    setValue(valueSignal.value);
  });
  useSignalEffect(() => {
    if (items.value.length == 0) {
      valueSignal.value = '';
      setValue('');
    }
  });
  return (
    <div className="flex flex-col mt-2">
      <Label className="mb-2">Variação</Label>
      <div className="flex flex-row w-full">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="flex-1 justify-between">
              <span className={!value ? 'opacity-50' : ''}>
                {value ? items.value.find((variant) => variant === value) : 'Selecione uma Variação...'}
              </span>
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput
                placeholder="Digite..."
                className="h-9"
                onValueChange={setSearch}
                onKeyDown={(e) => {
                  if (e.key != 'Enter') return;
                  if (!search) return;
                  onEmptySubmit?.(search);
                }}
              />
              <CommandList>
                <CommandEmpty className={cn('py-6 text-center text-sm ', search ? 'underline' : 'opacity-50')}>
                  {search ? `Criar variação "${search}"` : 'Digite para criar uma nova variação'}
                </CommandEmpty>
                <CommandGroup>
                  {items.value.map((variant) => (
                    <CommandItem
                      key={variant}
                      value={variant}
                      onSelect={(currentValue) => {
                        if (currentValue === value) return;
                        const newValue = currentValue;
                        setValue(newValue);
                        valueSignal.value = newValue;
                        setOpen(false);
                      }}
                    >
                      {variant}
                      <Check className={cn('ml-auto', value === variant ? 'opacity-100' : 'opacity-0')} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:cursor-pointer"
              disabled={!value || (search.length > 0 && value != search)}
            >
              <Trash2 className="opacity-50 size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-50 flex flex-col gap-4 items-center">
            <h1>Você tem certeza?</h1>
            <div className="flex flex-row justify-around gap-2">
              <PopoverClose asChild>
                <Button variant="default">Não</Button>
              </PopoverClose>
              <PopoverClose asChild>
                <Button
                  variant="secondary"
                  onClick={() => {
                    onTrashSubmit?.(value);
                  }}
                >
                  Sim
                </Button>
              </PopoverClose>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
