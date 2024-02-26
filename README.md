# 💾 Svelte Stored Writable

A drop-in extension of Svelte's `writable` that additionally stores and restores its contents using localStorage. Perfect for saving local preferences and much more. Fully type-safe.

This project builds upon the solid foundation provided by [@efstajas/svelte-stored-writable](https://github.com/efstajas/svelte-stored-writable), introducing the following enhancements for improved usability and robustness:

- **Improved Error Handling**: In the original implementation, encountering a Zod parsing error would result in an exception being thrown. This version improves upon this by gracefully reverting to the default value specified in the writable's initialization when Zod schema validation fails. This ensures your application remains resilient and prevents unexpected crashes due to localStorage data inconsistencies.

- **Simplified Function Parameters**: To make the API more developer-friendly and to reduce the cognitive load when creating a new `storedWritable`, we've transitioned from using multiple parameters to a single, destructured object. This change not only enhances readability but also makes the function's usage more intuitive. Here's a quick comparison to illustrate the update:

**Before:**

```ts
const myStoredWritable = storedWritable(
  "my-writable-key",
  myWritableSchema,
  { foo: "hello", bar: 1234 },
  true,
);
```

**After:**

```ts
const myStoredWritable = storedWritable({
  key: "my-writable-key",
  schema: myWritableSchema,
  initialValue: { foo: "hello", bar: 1234 },
  skipLocalStorage: true,
});
```

By encapsulating the parameters within a single object, we offer a cleaner and more manageable interface for developers, streamlining the creation and configuration of `storedWritable` instances.

These modifications aim to enhance the developer experience by providing better error management and a more accessible API, all while maintaining the original package's full type safety and local storage integration capabilities.

## ⬇️ Installation

Install with a package manager of your choice. We're also installing `zod` to be able to define the writable's schema (more on this below).

```bash
npm install @braden-w/svelte-stored-writable zod

# OR

yarn add @braden-w/svelte-stored-writable zod

# OR

pnpm add @braden-w/svelte-stored-writable zod

# OR

bun add @braden-w/svelte-stored-writable zod
```

## 🤓 Usage

### Creating a new storedWritable

To generate a new storedWritable, call it with a single object parameter that includes `key`, `schema` and `initialValue`:

```ts
import storedWritable from "@braden-w/svelte-stored-writable";
import { z } from "zod";

const myWritableSchema = z.object({
  foo: z.string(),
  bar: z.number(),
});

const myStoredWritable = storedWritable({
  key: "my-writable-key",
  schema: myWritableSchema,
  initialValue: {
    foo: "hello",
    bar: 1234,
  },
});
```

#### `key`

Defines the localStorage `key` that this writable should use. Usually, you want to keep this unique between storedWritables (and other mechanisms writing to localStorage in your application) to avoid interference.

#### `schema`

Receives a `zod` schema definition. This schema is used both to infer the writable's type for Typescript, and also to validate localStorage contents at runtime. Using the zod schema, we can ensure that the writable's contents always match the expected type definition, even if localStorage has been meddled with for some reason. This means that if you call `storedWritable` and it finds a previous value in localStorage that doesn't match the expected schema, it will throw a Zod Parse Error.

#### `initialValue`

When calling `storedWritable`, it will first attempt to restore any previously-saved content from localStorage. If it doesn't find any, or the value fails to parse, it will fall back to `initialValue`. Note that writable content is only saved to localStorage on a call to `.set` or `.update`.

#### Optional: `skipLocalStorage`

Pass `true` as the last argument to disable all interaction with localStorage. This will cause the writable to _not_ attempt to restore contents from localStorage, or write any changes. You might want to set this to `true` in an SSR context, for instance, where the server has no access to `localStorage`.

Tip: If you're using SvelteKit, you can pass `!browser` as the last argument to automatically skip localStorage interactions while rendering server-side.

### Reading from and writing to the storedWritable

You can interact with a `storedWritable` in the exact same way as a normal `writable`.
Additionally, you can call `storedWritable.clear` to delete any saved data in localStorage, and reset it back to `initialValues`.

```ts
// Assuming myStoredWritable is already created as shown above

const { foo, bar } = get(myStoredWritable); // foo: 'hello', bar: 1234

myStoredWritable.set({ foo: "goodbye", bar: 1234 }); // Saves new values to localStorage
const { foo, bar } = get(myStoredWritable); // foo: 'goodbye', bar: 1234

myStoredWritable.update((v) => ({ ...v, bar: v.bar + 1 })); // Saves new values to localStorage
const { foo, bar } = get(myStoredWritable); // foo: 'goodbye', bar: 1235

myStoredWritable.clear(); // Deletes any saved data in localStorage
const { foo, bar } = get(myStoredWritable); // foo: 'hello', bar: 1234
```

Within a Svelte component, you can also use the usual `$writable` syntax to conveniently subscribe to changes of a `storedWritable`.

### Setting a custom writable type

If you want to use a custom TypeScript type for the storedWritable, you can pass an optional type parameter. When setting a type parameter,
your `schema` parameter must match the supplied type.

```ts
import storedWritable from "@braden-w/svelte-stored-writable";
import { z } from "zod";

interface MyWritableType {
  foo: string;
  bar: number;
}

const myWritableSchema = z.object({
  foo: z.string(),
  bar: z.number(),
});

// myStoredWritable is typed as Writable<MyWritableType>. `myWritableSchema` must match `MyWritableType`.
const myStoredWritable = storedWritable<MyWritableType>({
  key: "my-writable-key",
  schema: myWritableSchema,
  initialValue: {
    foo: "hello",
    bar: 1234,
  },
});
```

### Synchronizing values between tabs

The storedWritable automatically uses [`storageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) to keep changes to its localStorage key triggered from other tabs or windows synchronized.

## Credits

This project is a fork of [@efstajas/svelte-stored-writable](https://github.com/efstajas/svelte-stored-writable) by Georgios Jason Efstathiou. The original idea and implementation have been pivotal in creating this enhanced version.
