import { writable, type Writable, get } from "svelte/store";
import { z } from "zod";

function loadFromStorage<T>({
  key,
  schema,
  defaultValue,
}: {
  key: string;
  schema: z.ZodSchema<T>;
  defaultValue: T;
}): T {
  const value = localStorage.getItem(key);
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return schema.parse(parsed);
  } catch {
    return defaultValue;
  }
}

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

  // Subscribe to window storage event to keep changes from another tab in sync.
  if (!disableLocalStorage) {
    window?.addEventListener("storage", (event) => {
      if (event.key === key) {
        if (event.newValue === null) {
          store.set(initialValue);
          return;
        }

        try {
          store.set(schema.parse(JSON.parse(event.newValue)));
        } catch {
          store.set(initialValue);
        }
      }
    });
  }

  /**
   * Set writable value and inform subscribers. Updates the writeable's stored data in
   * localstorage.
   * */
  function set(...args: Parameters<typeof store.set>) {
    store.set(...args);
    if (!disableLocalStorage)
      localStorage.setItem(key, JSON.stringify(get(store)));
  }

  /**
   * Update writable value using a callback and inform subscribers. Updates the writeable's
   * stored data in localstorage.
   * */
  function update(...args: Parameters<typeof store.update>) {
    store.update(...args);
    if (!disableLocalStorage)
      localStorage.setItem(key, JSON.stringify(get(store)));
  }

  /**
   * Delete any data saved for this StoredWritable in localstorage.
   */
  function clear() {
    store.set(initialValue);
    localStorage.removeItem(key);
  }

  return {
    subscribe: store.subscribe,
    set,
    update,
    clear,
  };
}
