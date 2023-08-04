<script lang="ts">
  import { spring } from "svelte/motion";
  import { pannable } from "./pannable";
  import { fade } from 'svelte/transition';
  import ContextMenu from "./ContextMenu.svelte";
  import { createEventDispatcher, onDestroy } from "svelte";
  import { world2screen, screen2world } from "./coordinates";


  const dispatch = createEventDispatcher()

  export let x: number;
  export let y: number;

  export let index: number;
  export let camera_coords;

  export let has_cone = true;

  let show_popup = false;
  let grabbing = false;

  const coords = spring({
    x: 0,
    y: 0
  })


$: coords.update(() => {
  return {
    x: world2screen(Number(x)).x,
    y: world2screen(Number(y)).y
  }
})

  function handlePanMove(event) {
    show_popup = true
    x = Math.round((x + screen2world(event.detail.dx).x) * 100) / 100
    y = Math.round((y + screen2world(event.detail.dy).y) * 100) / 100
  }
  let show_menu = false

</script>


<ContextMenu bind:showModal={show_menu}>
  <ul class="contextmenu">
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <li on:click={() => dispatch('remove', index)}>Remover Ponto</li>
  </ul>
</ContextMenu>

<div style="
background: {has_cone ? "green" : "blue"};
translate: {($camera_coords?.x||0) + $coords.x - 50/2}px {($camera_coords?.y||0) + $coords.y - 50/2}px;
cursor: {grabbing ? 'grabbing' : 'grab'}
"
role="button"
tabindex="0"
use:pannable={[0]}
on:panmove={handlePanMove}
on:panstart={() => grabbing = true}
on:panend={() => {
  show_popup = false;
  grabbing = false
}}
on:contextmenu={e => {
  e.stopPropagation()
  e.preventDefault()
  show_menu = true
}}
>
  <span>
    p{index}
  </span>

  {#if show_popup}
    <div class="popup" transition:fade>
      <span>x: {Math.floor(screen2world($coords.x).x)}</span>
      <span>y: {Math.floor(screen2world($coords.y).y)}</span>
    </div>
  {/if}
</div>

  <style>

  .contextmenu {
    list-style: none;
    margin: 0;
    padding: 0;

    &>li {
      padding: 2px;
      cursor: pointer;

      &:hover {
        background: gray;
      }
    }
  }

    div {
      user-select: none;
      position: absolute;
      z-index: 1;
      width: 50px;
      height: 50px;
      display: grid;
      place-items: center;

      &>span {
        text-align: center;
      }
    }

    .popup {
      position: absolute;
      padding: 10px 5px;
      background: red;
      left: 55px;
      bottom: 55px;
    }

  </style>
