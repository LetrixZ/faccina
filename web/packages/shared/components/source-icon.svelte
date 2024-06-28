<script lang="ts">
  import { cn } from "~/utils";
  import IcBaselineQuestionMark from "~icons/ic/baseline-question-mark";
  import Anchira from "../assets/anchira.png";
  import EHentai from "../assets/e-hentai.png";
  import Fakku from "../assets/fakku.svg";
  import HenTag from "../assets/hentag.png";
  import HentaiNexus from "../assets/hentainexus.png";
  import Irodori from "../assets/irodori.png";
  import Patreon from "../assets/patreon.png";
  import Pixiv from "../assets/pixiv.png";
  import ProjectHentai from "../assets/project-hentai.png";

  export let name: String;

  $: image = (() => {
    switch (name.toLowerCase()) {
      case "fakku":
        return Fakku;
      case "irodori comics":
        return Irodori;
      case "anchira":
        return Anchira;
      case "hentainexus":
        return HentaiNexus;
      case "e-hentai":
        return EHentai;
      case "exhentai":
        return EHentai;
      case "pixiv":
        return Pixiv;
      case "patreon":
        return Patreon;
      case "project hentai":
        return ProjectHentai;
      case "hentag":
        return HenTag;
      default:
        return;
    }
  })();

  $: style = (() => {
    switch (name.toLowerCase()) {
      case "fakku":
        return "background: #AB2328; padding: 0.275rem";
      case "irodori comics":
        return "background: #4449FB; padding: 0.3125rem";
      case "e-hentai":
        return "background: #DFDDD2; padding: 0.3125rem";
      case "exhentai":
        return "background: black; filter: brightness(1.25); padding: 0.3125rem";
      case "project hentai":
        return "background: #35393B; padding: 0.125rem";
      case "hentag":
        return "background: #101827; padding: 0.25rem";
      case "patreon":
        return "background: white; padding: 0.125rem";
      case "hentainexus":
        return "background: black;";
    }
  })();

  let className: string | null | undefined = undefined;

  export { className as class };
</script>

<div class={cn("flex flex-shrink-0 size-6 items-center justify-center overflow-clip rounded-md bg-neutral-400", className)} {style}>
  {#if image}
    <img src={image} alt={`${name} icon`} />
  {:else}
    <IcBaselineQuestionMark class="text-black" />
  {/if}
</div>
