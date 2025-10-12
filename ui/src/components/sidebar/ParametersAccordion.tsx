import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Signal } from '@preact-signals/safe-react';
import { type ReactiveDescription } from '@/lib/ros_utils';
import { For } from '@preact/signals-react/utils';
import FormItemNumber from './FormItemNumber';
import FormItemBoolean from './FormItemBoolean';
import FormItemString from './FormItemString';

export default function ParametersAccordion({
  value,
  descriptions,
}: {
  value: string;
  descriptions: Signal<ReactiveDescription[]>;
}) {
  return (
    <AccordionItem value={value} className="sticky-accordion-container">
      <AccordionTrigger>Parâmetros</AccordionTrigger>
      <AccordionContent className="flex flex-col p-5 w-full">
        <div className="flex flex-col w-full">
          <For each={descriptions}>
            {({ name, type, signal, modified }) =>
              type == 3 ? (
                <FormItemNumber
                  step={0.01}
                  id={name}
                  valueSignal={signal as Signal<number>}
                  key={name}
                  className="mt-5"
                  modified={modified}
                />
              ) : type == 2 ? (
                <FormItemNumber
                  step={1}
                  id={name}
                  valueSignal={signal as Signal<number>}
                  key={name}
                  className="mt-5"
                  modified={modified}
                />
              ) : type == 1 ? (
                <FormItemBoolean
                  id={name}
                  valueSignal={signal as Signal<boolean>}
                  key={name}
                  className="mt-5" //.
                />
              ) : type == 4 ? (
                <FormItemString
                  id={name}
                  valueSignal={signal as Signal<string>}
                  key={name}
                  className="mt-5" //.
                />
              ) : (
                <span key={name} className="text-red-500">
                  {name} Tipo '{type}' desconhecido
                </span>
              )
            }
          </For>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
