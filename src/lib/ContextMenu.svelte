<script>
import { mouse_coords } from "./stores";
export let showModal; // boolean

	let dialog; // HTMLDialogElement

	let modalX = 0;
	let modalY = 0;

$: if (dialog && !dialog.open && showModal) {
	modalX = $mouse_coords.x
	modalY = $mouse_coords.y
	dialog.showModal();
}

$: if(dialog && dialog.open && !showModal){
	dialog.close()
}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog
	bind:this={dialog}
	on:close={() => (showModal = false)}
	on:click|self={() => dialog.close()}
	style="
	translate: {modalX}px calc({modalY}px - 100%);
	"
>
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div on:click|stopPropagation>
		<slot name="header" />
		<slot />
	</div>
</dialog>

<style>
	dialog {
		max-width: 32em;
		border-radius: 0.2em;
		border: none;
		padding: 0;
		top: 0;
		left: 0;
		margin: 0;
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.1);
	}
	dialog > div {
		padding: 1em;
	}
	dialog[open] {
		animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}
	dialog[open]::backdrop {
		animation: fade 0.2s ease-out;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
