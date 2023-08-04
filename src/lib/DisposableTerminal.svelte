<script>
	import { onMount } from "svelte";

	export let terminal;
	let terminal_container

	onMount(() => {
		terminal.open(terminal_container)

		return () => terminal.dispose()
	})

</script>


<div id="terminal-container" bind:this={terminal_container} ></div>
