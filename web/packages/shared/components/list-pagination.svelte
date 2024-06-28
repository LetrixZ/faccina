<script lang="ts">
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import ChevronRight from "lucide-svelte/icons/chevron-right";
  import { cn } from "../utils";
  import { Button } from "./ui/button";
  import * as Pagination from "./ui/pagination";

  let className: string | null | undefined = undefined;

  export let page;
  export let total;
  export let limit: number | undefined;
  export let urlParams = new URLSearchParams();

  export let onPageChange: ((page: number) => void) | undefined = undefined;

  export { className as class };

  const getPageUrl = (page: number, searchParams: URLSearchParams) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", page.toString());

    return `/?${query.toString()}`;
  };

  $: prevPageUrl = (() => {
    if (page > 1) {
      const query = new URLSearchParams(urlParams);
      query.set("page", (page - 1).toString());

      return `/?${query.toString()}`;
    }
  })();

  $: nextPageUrl = (() => {
    if (page < Math.ceil(total / 24)) {
      const query = new URLSearchParams(urlParams);
      query.set("page", (page + 1).toString());

      return `/?${query.toString()}`;
    }
  })();
</script>

<Pagination.Root count={total} perPage={limit} {page} let:pages let:currentPage {onPageChange} class={className}>
  <Pagination.Content>
    <Pagination.Item>
      <Button
        href={prevPageUrl}
        variant="ghost"
        size="sm"
        class={cn("gap-1 pl-2.5", !prevPageUrl && "pointer-events-none opacity-50")}
        on:click={(event) => {
          if (onPageChange) {
            event.preventDefault();
            onPageChange?.(page - 1);
          }
        }}
      >
        <ChevronLeft class="h-4 w-4" />
        <span class="hidden sm:block">Previous</span>
      </Button>
    </Pagination.Item>
    {#each pages as _page (_page.key)}
      {#if _page.type === "ellipsis"}
        <Pagination.Item>
          <Pagination.Ellipsis />
        </Pagination.Item>
      {:else}
        <Pagination.Item>
          <Button
            href={getPageUrl(_page.value, urlParams)}
            on:click={(event) => {
              if (onPageChange) {
                event.preventDefault();
                onPageChange?.(_page.value);
              }
            }}
            size="sm"
            variant={_page.value === currentPage ? "outline" : "ghost"}
          >
            {_page.value}
          </Button>
        </Pagination.Item>
      {/if}
    {/each}
    <Pagination.Item>
      <Button
        href={nextPageUrl}
        variant="ghost"
        size="sm"
        class={cn("gap-1 pl-2.5", !nextPageUrl && "pointer-events-none opacity-50")}
        on:click={(event) => {
          if (onPageChange) {
            event.preventDefault();
            onPageChange?.(page + 1);
          }
        }}
      >
        <span class="hidden sm:block">Next</span>
        <ChevronRight class="h-4 w-4" />
      </Button>
    </Pagination.Item>
  </Pagination.Content>
</Pagination.Root>
