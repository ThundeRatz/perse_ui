import { rosclient } from '@/lib/rosclient';
import { computed, Signal, useSignalEffect } from '@preact-signals/safe-react';
import NodeSelect, { selected } from './NodeSelect';
import VariationsCombo from './VariationsCombo';
import FormItemString from './FormItemString';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { save_all } from './save_observer';

const node_state = computed(() => rosclient.node_states.value.find((ns) => ns.node == selected.value));

export default function Header({
  variantSignal,
  savePathSignal,
  onEmptySubmit,
  onTrashSubmit,
}: {
  variantSignal: Signal<string>;
  savePathSignal: Signal<string>;
  onEmptySubmit?: (value: string) => void;
  onTrashSubmit?: (value: string) => void;
}) {
  useSignalEffect(() => {
    variantSignal.value = node_state.value?.default_variant ?? '';
    savePathSignal.value = node_state.value?.save_path ?? '';
  });

  return (
    <>
      <div className="m-5">
        <NodeSelect />
        <VariationsCombo valueSignal={variantSignal} onEmptySubmit={onEmptySubmit} onTrashSubmit={onTrashSubmit} />
        <FormItemString id="Caminho" valueSignal={savePathSignal} placeholder="~/test.yaml" />
      </div>
      <div className={cn('m-5 top-0', rosclient.modified.value ? 'sticky' : '')}>
        <Button variant="secondary" className="cursor-pointer w-full" onClick={save_all} disabled={!rosclient.modified.value}>
          Salvar Tudo
        </Button>
      </div>
    </>
  );
}
