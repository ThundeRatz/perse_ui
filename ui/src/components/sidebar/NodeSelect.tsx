import { useSignalEffectOnce } from '@preact-signals/utils/hooks';
import { rosclient } from '@/lib/rosclient';
import { signal, computed } from '@preact-signals/safe-react';
import FormItemSelect from './FormItemSelect';

const items = computed(() => {
  const active_nodes = rosclient.services.value
    .filter((v) => v.includes('list_parameters'))
    .map((v) => v.replace('/list_parameters', ''));
  const cached_nodes = rosclient.node_states.value.map((v) => v.node);
  return Array.from(new Set([...cached_nodes, ...active_nodes]));
});

// eslint-disable-next-line react-refresh/only-export-components
export const selected = signal('');

export default function NodeSelect() {
  useSignalEffectOnce(() => {
    if (items.value.includes('/decision_node')) {
      selected.value = '/decision_node';
    }
  });

  return <FormItemSelect valueSignal={selected} id="Node" items={items.value} />;
}
