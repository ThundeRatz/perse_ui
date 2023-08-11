<script lang="ts">
  import { spring } from "svelte/motion";
  import { pannable } from "./pannable";
  import { fade } from 'svelte/transition';
  import ContextMenu from "./ContextMenu.svelte";
  import { createEventDispatcher } from "svelte";
  import { world2screen, screen2world } from "./coordinates";


  const dispatch = createEventDispatcher()

  export let x: number;
  export let y: number;

  export let zoom_level: number = 1;

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
    x: world2screen(Number(x)).x * zoom_level,
    y: world2screen(Number(y)).y * zoom_level
  }
})

  function handlePanMove(event) {
    show_popup = true
    x = Math.round((x + screen2world(event.detail.dx / zoom_level).x) * 100) / 100
    y = Math.round((y + screen2world(event.detail.dy / zoom_level).y) * 100) / 100
  }
  let show_menu = false
$: document.body.style.cursor = grabbing ? 'grabbing' : ''
</script>

<ContextMenu bind:showModal={show_menu}>
<ul class="contextmenu">
<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<li on:click={() => dispatch('remove', index)}>Remover Ponto</li>
</ul>
</ContextMenu>

<div style="
background: {has_cone ? "#4773B2" : "#545454"};
color: {has_cone ? "#1D1D1D" : "#e3e3e3"};
border-color: {has_cone ? "#3662a1" : "#636363"};
translate: {($camera_coords?.x||0) + $coords.x - 50/2}px {($camera_coords?.y||0) + $coords.y - 50/2}px;
cursor: {grabbing ? 'grabbing' : 'grab'};
width: {50*zoom_level}px;
"
role="button"
tabindex="0"
class="container"
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
    {index}
  </span>

  {#if show_popup}
    <div class="popup" transition:fade>
      <span>x: {Math.floor(screen2world($coords.x / zoom_level).x)}</span>
      <span>y: {Math.floor(screen2world($coords.y / zoom_level).y)}</span>
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

    .container {
      user-select: none;
      position: absolute;
      z-index: 1;
      border-radius: 50%;
      aspect-ratio: 1/1;
      display: grid;
      place-items: center;
      border-width: 1.5px;
      border-style: solid;

      &:focus-visible {
        outline: none;
      }

      &>span {
        text-align: center;
      }
    }

    .popup {
      position: absolute;
      padding: 10px 5px;
      width: 50px;
      background: #1D1D1D;
      color: #e3e3e3;
border-radius: 7px;
      left: 55px;
      bottom: 55px;
display: flex;
flex-direction: column;
text-align: center;
    }

  </style>
