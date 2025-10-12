import { type ParameterMsg } from '@/lib/ros_utils';
import { rosclient } from '@/lib/rosclient';

type SaveData = { variant: string; node: string; path: string; parameters: ParameterMsg[] };
const subscribed_callbacks = new Map<string, () => SaveData>();

export function subscribeCallback(id: string, callback: () => SaveData) {
  console.log('subscribed!', id);
  subscribed_callbacks.set(id, callback);
}

export async function save_all() {
  for (const callback of subscribed_callbacks.values()) {
    const { variant, node, path, parameters } = callback();

    let response = await rosclient.saveVariant(node, variant, parameters);
    console.log('SaveVariant', response);
    response = await rosclient.installVariant(path, node, variant);
    console.log('InstallVariant', response);
  }
}
