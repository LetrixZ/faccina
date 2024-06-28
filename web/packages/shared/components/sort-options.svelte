<script lang="ts">
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import ChevronUp from "lucide-svelte/icons/chevron-up";
  import { Ordering, Sorting } from "../models";
  import { Button } from "./ui/button";
  import { Label } from "./ui/label";
  import * as Select from "./ui/select";

  const sortOptions = [
    {
      label: "Date released",
      value: Sorting.RELEASED_AT,
    },
    {
      label: "Date added",
      value: Sorting.CREATED_AT,
    },
    {
      label: "Relevance",
      value: Sorting.RELEVANCE,
    },
    {
      label: "Title",
      value: Sorting.TITLE,
    },
    {
      label: "Pages",
      value: Sorting.PAGES,
    },
  ];

  export let sort: Sorting = Sorting.RELEASED_AT;
  export let order: Ordering = Ordering.DESC;

  export let onSort: ((sort: Sorting) => void) | undefined = undefined;
  export let onOrder: ((order: Ordering) => void) | undefined = undefined;

  $: sortOption = sort && sortOptions.find((option) => option.value === sort);
</script>

<div class="flex items-end justify-between gap-2">
  <div class="w-full space-y-0.5 md:w-fit">
    <Label>Sort by</Label>
    <Select.Root items={sortOptions} selected={sortOption} onSelectedChange={(option) => onSort?.(option?.value ?? Sorting.RELEASED_AT)}>
      <Select.Trigger class="w-full md:w-48" aria-label="Select sorting option">
        <Select.Value class="text-muted-foreground-light" />
      </Select.Trigger>
      <Select.Content>
        {#each sortOptions as option}
          <Select.Item value={option.value}>{option.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <Button
    variant="ghost"
    class="size-8 p-0 text-muted-foreground-light"
    on:click={() => {
      order = order === Ordering.DESC ? Ordering.ASC : Ordering.DESC;
      onOrder?.(order);
    }}
  >
    {#if order === Ordering.DESC}
      <span class="sr-only">Set ascending order</span>
      <ChevronDown />
    {:else}
      <span class="sr-only">Set descending order</span>
      <ChevronUp />
    {/if}
  </Button>
</div>
