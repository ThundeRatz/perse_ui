<script lang="ts">
  import { spring } from "svelte/motion";
  import ContextMenu from "./ContextMenu.svelte";
  import { world2screen } from "./coordinates";

  export let x: number = 0;
  export let y: number = 0;
  export let angle: number = 0;

  export let camera_coords;

  const coords = spring({
    x: 0,
    y: 0,
    angle: 0
  })



  $: coords.update(() => ({
      ...world2screen(-Number(x), -Number(y)),
      angle: angle+Math.PI*0.7
  }))

  let show_menu = false

</script>


<ContextMenu bind:showModal={show_menu}>
  <ul class="contextmenu">
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <li on:click={() => {
      show_menu = false
      x = 0
      y = 0
      angle = 0
    }}>Resetar Posição</li>
  </ul>
</ContextMenu>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div style="
  translate: {($camera_coords?.x||0) + $coords.x - 100/2}px {($camera_coords?.y||0) + $coords.y - 50/2}px;
  rotate: {$coords.angle}rad
  "
  role="button"
  tabindex="0"
  on:contextmenu={e => {
    e.stopPropagation()
    e.preventDefault()
    show_menu = true
  }}
>
  <span>
    Perse
  </span>

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
      width: 100px;
      height: 50px;
      display: grid;
      cursor: pointer;
      place-items: center;
      background: red;

      &>span {
        text-align: center;
      }
    }


  </style>
