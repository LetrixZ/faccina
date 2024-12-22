---
order: 2
title: Configuration
---

<script>
  import Generator from '$lib/components/Generator.svelte';
</script>

# {title}

Faccina is a file based configuration app meaning that everything can be changed by modifying the `config.toml` file.

You can provide another path to the configuration file with the enviornment variable `CONFIG_FILE`.

## Configurator

Here you can validate your config file and change the options with an easier interface.

Pasting your configuration will update the inputs and output a cleaned up version.

<Generator />
