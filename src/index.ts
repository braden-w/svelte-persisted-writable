import { writable, type Writable, get } from "svelte/store";
import { z } from "zod";

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

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
export default function storedWritable<
  S extends z.infer<T>,
  T extends z.ZodType = z.ZodType<S>
>({
  key,
  schema,
  initialValue,
  disableLocalStorage = false,
}: {
  key: string;
  schema: T;
  initialValue: z.infer<typeof schema>;
  disableLocalStorage?: boolean;
}): Writable<
  Equals<T, typeof schema> extends true ? S : z.infer<typeof schema>
> & { clear: () => void } {
  const stored = !disableLocalStorage ? localStorage.getItem(key) : null;

  // Subscribe to window storage event to keep changes from another tab in sync.
  if (!disableLocalStorage) {
    window?.addEventListener("storage", (event) => {
      if (event.key === key) {
        if (event.newValue === null) {
          w.set(initialValue);
          return;
        }

        w.set(schema.parse(JSON.parse(event.newValue)));
      }
    });
  }

  const w = writable<S>(
    stored ? schema.parse(JSON.parse(stored)) : initialValue
  );

  /**
   * Set writable value and inform subscribers. Updates the writeable's stored data in
   * localstorage.
   * */
  function set(...args: Parameters<typeof w.set>) {
    w.set(...args);
    if (!disableLocalStorage) localStorage.setItem(key, JSON.stringify(get(w)));
  }

  /**
   * Update writable value using a callback and inform subscribers. Updates the writeable's
   * stored data in localstorage.
   * */
  function update(...args: Parameters<typeof w.update>) {
    w.update(...args);
    if (!disableLocalStorage) localStorage.setItem(key, JSON.stringify(get(w)));
  }

  /**
   * Delete any data saved for this StoredWritable in localstorage.
   */
  function clear() {
    w.set(initialValue);
    localStorage.removeItem(key);
  }

  return {
    subscribe: w.subscribe,
    set,
    update,
    clear,
  };
}
