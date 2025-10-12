import { clsx, type ClassValue } from 'clsx';
import { useLayoutEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import type { Parameter, ReactiveDescription } from './ros_utils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function quaternion2euler(x: number, y: number, z: number, w: number) {
  const Rx = Math.atan2(2 * (x * y + z * w), 1 - 2 * (y * y + z * z));
  const Ry = Math.asin(2 * (x * z - w * y));
  const Rz = Math.atan2(2 * (x * w + y * z), 1 - 2 * (z * z + w * w));

  return { Rx, Ry, Rz };
}

export function roundTo(num: number, decimal_places = 2) {
  return Math.round((num + Number.EPSILON) * 10 ** decimal_places) / 10 ** decimal_places;
}

export function* zip<T, U>(a: T[], b: U[]): Generator<[T, U]> {
  if (a.length !== b.length) {
    throw new Error('Unable to zip arrays of different length');
  }

  for (let i = 0; i < a.length; i++) {
    yield [a[i], b[i]];
  }
}

export function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  return size;
}

export function shallowParameters2nestedParameters<T extends Parameter | ReactiveDescription>(shallowParameters: T[]) {
  const dict: {
    [key: string]: Record<string, T>; // Permite chaves como 'p1', 'p2', etc.
  } = {};

  shallowParameters.forEach((item) => {
    const parts = item.name.split('.');
    if (parts.length < 2) return;

    const parentKey = parts[0]; // Ex: 1
    const childKey = parts.slice(1).join('.'); // Ex: "x", "y", "n", ou "qualquer.outro.texto"

    if (!dict[parentKey]) {
      dict[parentKey] = {};
    }

    dict[parentKey][childKey] = item;
  });
  return dict;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compareListOfObjects(list1: any[], list2: any[]): boolean {
  // Validação inicial: verifica se as entradas são arrays e não nulas
  if (!Array.isArray(list1) || list1 === null || !Array.isArray(list2) || list2 === null) {
    console.error('Erro: As entradas devem ser arrays não nulos.');
    return false;
  }

  // Compara o número de elementos nos arrays
  if (list1.length !== list2.length) {
    return false;
  }

  // Normaliza os objetos para ignorar a ordem dentro de cada objeto e a ordem dos objetos na lista.
  // Converte cada objeto em uma string JSON ordenada.
  const normalizedList1 = new Set<string>(
    list1.map((obj) => {
      if (typeof obj !== 'object' || obj === null) {
        // Lida com elementos não-objeto no array, se necessário
        return JSON.stringify(obj);
      }
      return JSON.stringify(
        Object.keys(obj)
          .sort()
          .reduce(
            (newObj, key) => {
              newObj[key] = obj[key];
              return newObj;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {} as Record<string, any>,
          ),
      );
    }),
  );

  const normalizedList2 = new Set<string>(
    list2.map((obj) => {
      if (typeof obj !== 'object' || obj === null) {
        // Lida com elementos não-objeto no array, se necessário
        return JSON.stringify(obj);
      }
      return JSON.stringify(
        Object.keys(obj)
          .sort()
          .reduce(
            (newObj, key) => {
              newObj[key] = obj[key];
              return newObj;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {} as Record<string, any>,
          ),
      );
    }),
  );

  // Compara os Sets de strings JSON normalizadas
  if (normalizedList1.size !== normalizedList2.size) {
    return false;
  }

  for (const objStr of normalizedList1) {
    if (!normalizedList2.has(objStr)) {
      return false;
    }
  }

  return true;
}

const namedTimeouts: Record<string, ReturnType<typeof setTimeout | typeof setInterval>> = {};

export function withTimeout<T>(name: string, promise: Promise<T>, ms: number, callback?: () => void): Promise<T | null> {
  const timeout = new Promise<null>((resolve, _) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      callback?.();
      resolve(null);
    }, ms);
    if (name in namedTimeouts) {
      clearTimeout(namedTimeouts[name]);
    }
    namedTimeouts[name] = id;
  });

  return Promise.race([promise, timeout]);
}

type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends Record<PropertyKey, unknown> ? DeepReadonly<T[K]> : T[K];
};

/**
 * This function accepts an array or object. It freezes
 * the incoming value and any descendants recursively.
 *
 * @template T
 * @param {T} obj
 * @returns {Readonly<T>}
 */
export const deepFreeze = <T>(obj: T): DeepReadonly<T> => {
  // Valid object: YES.
  if (obj && ['function', 'object'].includes(typeof obj)) {
    // Loop through.
    Reflect.ownKeys(obj as object).forEach((key): void => {
      // Recursion.
      deepFreeze(obj[key as keyof T]);
    });
  }

  // Expose object.
  return Object.freeze(obj);
};
