<script>
import { spring } from "svelte/motion";
import { pannable } from "./pannable.js";
import { createEventDispatcher, onMount } from 'svelte';

export const camera_coords = spring({
  x: 0,
  y: 0 
})

const dispatch = createEventDispatcher();
let self;


function handlePanMove(event) {
  camera_coords.update(($camera_coords) => ({
    x: $camera_coords.x + event.detail.dx,
    y: $camera_coords.y + event.detail.dy 
  }))
}

</script>

<div role="button" tabindex=0
  bind:this={self}
  use:pannable={[1]}
  on:panmove={handlePanMove}
  on:contextmenu={(e) => {
    e.preventDefault()
    dispatch('contextmenu', e)
  }}
>
  <slot></slot>
</div>

<style>
  div {
    width: 100%;
    height: 100%;
  }

</style>
