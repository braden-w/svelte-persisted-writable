import { onDestroy } from "svelte";
import { get, writable, type Writable } from "svelte/store";
import { z } from "zod";

/**
 * An extension of Svelte's `writable` that also saves its state to localStorage and
 * automatically restores it.
 * @param key The localStorage key to use for saving the writable's contents.
 * @param schema A Zod schema describing the contents of the writable.
 * @param initialValue The initial value to use if no prior state has been saved in
 * localstorage.
 * @param disableLocalStorage Skip interaction with localStorage, for example during SSR.
 * @returns A stored writable.
 */
export default function storedWritable<T>({
  key,
  schema,
  initialValue,
  disableLocalStorage = false,
}: {
  key: string;
  schema: z.ZodSchema<T>;
  initialValue: T;
  disableLocalStorage?: boolean;
}): Writable<T> & { clear: () => void } {
  const storeValue = !disableLocalStorage
    ? loadFromStorage({ key, schema, defaultValue: initialValue })
    : initialValue;
  const store = writable(storeValue);

  if (!disableLocalStorage) {
    createStorageEventListener({ key, schema, store, initialValue });
  }

  /**
   * Set writable value and inform subscribers. Updates the writeable's stored data in
   * localstorage.
   * */
  function set(...args: Parameters<typeof store.set>) {
    store.set(...args);
    if (!disableLocalStorage) saveToStorage({ key, value: get(store) });
  }

  /**
   * Update writable value using a callback and inform subscribers. Updates the writeable's
   * stored data in localstorage.
   * */
  function update(...args: Parameters<typeof store.update>) {
    store.update(...args);
    if (!disableLocalStorage) saveToStorage({ key, value: get(store) });
  }

  /**
   * Delete any data saved for this StoredWritable in localstorage.
   */
  function clear() {
    store.set(initialValue);
    if (!disableLocalStorage) removeFromStorage(key);
  }

  return {
    subscribe: store.subscribe,
    set,
    update,
    clear,
  };
}

function loadFromStorage<T>({
  key,
  schema,
  defaultValue,
}: {
  key: string;
  schema: z.ZodSchema<T>;
  defaultValue: T;
}): T {
  try {
    const item = localStorage.getItem(key);
    return item ? schema.parse(JSON.parse(item)) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>({ key, value }: { key: string; value: T }) {
  localStorage.setItem(key, JSON.stringify(value));
}

function removeFromStorage(key: string) {
  localStorage.removeItem(key);
}

function createStorageEventListener<T>({
  key,
  schema,
  store,
  initialValue,
}: {
  key: string;
  schema: z.ZodSchema<T>;
  store: Writable<T>;
  initialValue: T;
}) {
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === key) {
      try {
        const newValue = event.newValue
          ? JSON.parse(event.newValue)
          : initialValue;
        const validValue = schema.parse(newValue);
        store.set(validValue);
      } catch {
        store.set(initialValue);
      }
    }
  };

  window.addEventListener("storage", handleStorageEvent);
  onDestroy(() => window.removeEventListener("storage", handleStorageEvent));
}

