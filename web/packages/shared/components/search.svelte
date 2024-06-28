<script lang="ts">
  import PhMagnifyingGlass from "~icons/ph/magnifying-glass";
  import { createEventDispatcher } from "svelte";
  import { Button } from "./ui/button";
  import { Input } from "./ui/input";
  import { cn } from "../utils";

  let className: string | null | undefined = undefined;

  const dispatch = createEventDispatcher();

  export let query = "";
  export { className as class };
</script>

<div class={cn(className)}>
  <form class="grid" on:submit|preventDefault={() => dispatch("search", { query })}>
    <div
      class="flex h-full rounded-md bg-neutral-700/30 ring-offset-background focus-within:outline-none focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-1 hover:ring-1 hover:ring-ring overflow-clip"
    >
      <Input
        type="search"
        placeholder="tag:petite creampie"
        class="h-fit flex-grow border-0 bg-transparent py-2 !ring-0 !ring-offset-0"
        bind:value={query}
        name="q"
      />
      <Button type="submit" variant="ghost" class="h-full rounded-none py-0 text-muted-foreground !ring-0 !ring-offset-0 focus-within:text-white">
        <PhMagnifyingGlass />
      </Button>
    </div>
  </form>
</div>
