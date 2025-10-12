/// <reference types="vite/client" />

import 'fabric';
import 'roslib';

declare module 'fabric' {
  interface FabricObject {
    __name?: string;
    __instance?: object;
  }
}

declare module 'roslib' {
  type Message = Record<string, unknown>;
}
