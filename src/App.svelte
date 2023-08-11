<script lang="ts">
import Point from "./lib/Point.svelte";
import Pannable from "./lib/Pannable.svelte";
import ContextMenu from "./lib/ContextMenu.svelte"; 
import { writable } from 'svelte/store';
import type { Spring } from 'svelte/motion';
import Perse from "./lib/Perse.svelte";
import { screen2world } from "./lib/coordinates";
import { onMount } from "svelte";
import socket from "./lib/socket";
import Modal from "./lib/Modal.svelte";
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Pane, Splitpanes } from 'svelte-splitpanes';
import BackgroundGrid from "./lib/BackgroundGrid.svelte";
import quaternion2euler from 'quaternion-to-euler'

interface IPoint {
  x: number,
  y: number,
  index: number,
  has_cone: boolean,
  key: number,
}

interface IField {
  name: string,
  type: string
}

interface ILaunchfile {
  domain: string,
  launchfile: string,
  running: boolean,
  stopping: boolean,
  terminal: Terminal,
  term_el: HTMLDivElement
}

interface ICoords {
  x: number,
  y: number,
  angle: number
}

type PossibleComands = 'run' | 'stop';

const OPTIONS_TERM = {
  useStyle: true,
  screenKeys: true,
  cursorBlink: true,
  //You have to set the same number in your server
  cols: 100,
  theme: {
    background: "#2d2d2d"
  }
};

const fitaddon = new FitAddon()

const OFFSET_FACTOR = {
  x: 100,
  y: 700
}

function updateOffsetCoords(camera_coords: undefined|ICoords, offsetX: undefined|number, offsetY:undefined|number){
  offset_coords.set({
    x: (camera_coords?.x||0) + (offsetX||0),
    y: (camera_coords?.y||0) + (offsetY||0)
  })
}

const resizeObserver = new ResizeObserver((entries) => {
  for(let entry of entries){
    if(terminal_container && entry.target == terminal_container){
      fitaddon.fit()
      continue
    }else if(left_pane && entry.target == left_pane){
      updateOffsetCoords($camera_coords, OFFSET_FACTOR.x, OFFSET_FACTOR.y)
    }
  }
});

$: {
  const rect = left_pane?.getClientRects()[0]
  rect && updateOffsetCoords($camera_coords, OFFSET_FACTOR.x, OFFSET_FACTOR.y)
}

$: terminal_container && openConsole(activeConsole)

function openConsole(domain_launchfile: string){
  if(!domain_launchfile){
    return
  }

  for(let launchfile of launchfiles){
    if(`${launchfile.domain} ${launchfile.launchfile}` == domain_launchfile){
      if(launchfile.term_el == undefined){
        const el = document.createElement('div')

        launchfile.term_el = el
        launchfile.terminal.open(el)
      }else{
        launchfile.term_el.style.display = ''
      }

      if(!terminal_container.contains(launchfile.term_el)){
        terminal_container.append(launchfile.term_el)
      }

    }else if(launchfile.term_el){
      launchfile.term_el.style.display = 'none'
    }


  }

  fitaddon.fit()
}


$: if(terminal_container && activeConsole=='' && launchfiles.length){
  resizeObserver.observe(terminal_container);
  activeConsole=`${launchfiles[0].domain} ${launchfiles[0].launchfile}`

  fitaddon.fit()
} 


function runStopLaunchfile(command: PossibleComands, domain: string, launchfile: string){
  const found_launchfile = getLaunchfile(domain, launchfile)
  const found_index = launchfiles.indexOf(found_launchfile)

  if(command == 'run'){
    found_launchfile.terminal.reset()
  }

  launchfiles[found_index] = {...found_launchfile, stopping: true}
  socket.emit(command, { domain, launchfile })
}

function saveChanges(){
  socket.emit('save', { points, fields })
}

function addPoint(x: number, y: number, useWorldCoordinates=false){
  points = [...points, {
    x: useWorldCoordinates ? x : screen2world(x).x,
    y: useWorldCoordinates ? y : screen2world(y).y,
    index: points.reduce((p, n) => Math.max(p, n.index),0)+1,
    has_cone: true,
    key: points.reduce((p, n) => Math.max(p, n.key),0)+1,
  }]
  show_canvas_menu = false
}

function getLaunchfile(domain: string, launchfile: string) {
  return launchfiles.find(v => v.domain == domain && v.launchfile == launchfile)
}

function removePoint(index: number) {
  points = points.filter(point => point.index != index)
  for(let point of points){
    if(point.index <= index) continue;

    point.index = point.index - 1;
  }
}

onMount(() => {
  if(!socket.connected){
    socket.connect()
  }

  resizeObserver.observe(left_pane);

  socket.on('connect', () => {
    socket.emit('get points')
    socket.emit('get fields')
    show_reconnecting = false
  })

  socket.on('disconnect', () => show_reconnecting = true)

  socket.on('get points', (msg: {
    points: IPoint[]
  }) => {
    points = []
    for(let point of msg.points.sort((a:IPoint,b:IPoint) => a.index-b.index)){
      addPoint(point.x, point.y, true)
    }
  })

  socket.on('perse_transform', (msg: {
    rotation: {
      w: number,
        x: number,
        y: number,
        z: number
    },
    translation: {
      x: number,
      y: number,
      z: number
    }
  }) => {

    const [_x,_y,z] = quaternion2euler(
      [
        msg.rotation.w,
        msg.rotation.x,
        msg.rotation.y,
        msg.rotation.z,
      ]
    )

    console.log(z*(180/Math.PI))
    perse_coords = {
      x: msg.translation.x,
      y: msg.translation.y,
      angle: z
    }
  })


  socket.on('get fields', (msg: {
    fields: {
      [key: string]: IField
    }
  }) => {
    fields = Object.entries(msg.fields)
  })


  socket.on('launchfile_is_alive', (msg: {
    domain: string,
    launchfile: string,
    running: boolean
  }) => {
    const found_launchfile = getLaunchfile(msg.domain, msg.launchfile)
    const found_index = launchfiles.indexOf(found_launchfile)

    if(found_launchfile != undefined){
      launchfiles[found_index] = {...found_launchfile, stopping: false, running: msg.running}
    }else{
      const terminal = new Terminal(OPTIONS_TERM)
      terminal.loadAddon(fitaddon)

      launchfiles = [...launchfiles, {
        ...msg,
        stopping: false,
        term_el: undefined,
        terminal
      }]

    }
    console.log(`${msg.domain} ${msg.launchfile} is ${msg.running ? '' : 'not'} running`)
  })

  socket.on('console_stdout', (msg: {
      domain: string,
      launchfile: string,
      stdout: string
    }) => {
    const found_launchfile = getLaunchfile(msg.domain, msg.launchfile)

    found_launchfile?.terminal.write(msg.stdout)
  })

  socket.on('set perse coords', (msg: {
    coords: ICoords
  }) => {
    for(let key in msg.coords){
      perse_coords[key] = msg.coords[key]
    }
  })

  socket.on('saved', (msg: {status: boolean}) => {
    unsaved = !msg.status
  })

})


let left_pane: HTMLDivElement;
let right_pane: HTMLDivElement;
let terminal_container: HTMLDivElement;

let show_canvas_menu = false
let show_reconnecting = true;
let unsaved = false;

let activeTab: 'variaveis' | 'console' = 'variaveis'
let activeConsole = ''
let activeTool: 'move' | 'box' = 'box'

let camera_coords: Spring<ICoords>;
let perse_coords = {
  x: 0,
  y: 0,
  angle: 0
}
const offset_coords = writable({
	x: 0,
	y: 0
});

const zoom_level = writable(1);


let points: IPoint[] = []
const point_fields = ['x', 'y', 'has_cone']

let fields: Array<[string, IField]> = []
$: fields, unsaved = true
$: points, unsaved = true



let launchfiles: ILaunchfile[] = []



</script>

<main>

  <Splitpanes style="height: 100%; width: 100%; background:none">
  <Pane size={26} class="left_splitpane">
  <side class="left" bind:this={left_pane}>
    <nav>
      <button class:active={activeTab == 'variaveis'} on:click={() => activeTab = 'variaveis'} >Variaveis</button>
      <button class:active={activeTab == 'console'}   on:click={() => activeTab = 'console'}>Console</button>
    </nav>

    {#if activeTab == 'variaveis'}

      <h2>Parametros</h2>

      <div id="parametros">

        {#each fields.entries() as [index, [k, v]]}

          <div class="field">
            <span>{k} </span>

            {#if typeof v == 'boolean'}
              <input type="checkbox" bind:checked={v}>
            {:else if ['number', 'string'].includes(typeof v)}
              <input
                type="text"
                bind:value={v}
                class:round_top={index==0 || typeof fields[index-1][1] == 'boolean'}
                class:round_bottom={index==fields.length-1 || typeof fields[index+1][1] == 'boolean'}
              >
            {/if}

          </div>

        {/each}


      </div>

      <h2>Pontos</h2>

      <div id="pontos">
        {#each points as point (point.key)}
          <div class="point">

            <div class="point-header">
              <button on:click={() => removePoint(point.index)}>X</button>
              <h3>P{point.index}</h3>
            </div>

            {#each point_fields.entries() as [index, field]}
              <div class="sub-field">
                <span>{field} </span>

                {#if typeof point[field] == 'boolean'}
                  <input type="checkbox" bind:checked={point[field]}>
                {:else if ['number', 'string'].includes(typeof point[field])}
                  <input
                    type="text"
                    bind:value={point[field]}
                    class:round_top={index==0 || typeof point[point_fields[index-1]] == 'boolean'}
                    class:round_bottom={index==fields.length-1 || typeof point[point_fields[index+1]] == 'boolean'}
                  >
                {/if}

              </div>
            {/each}
          </div>

      {/each}
    </div>

  {:else if activeTab == 'console'}

    <nav>
      {#each launchfiles as launchfile}
        <button 
          class:active={activeConsole == `${launchfile.domain} ${launchfile.launchfile}`} 
          on:click={() => {
            activeConsole=`${launchfile.domain} ${launchfile.launchfile}`

          } }>
            {launchfile.launchfile}
        </button>
      {/each}
    </nav>

    <div id="terminal-container" bind:this={terminal_container} />


  {/if}

      
  </side>

  </Pane>
  <Pane>
  <side class="canvas right" bind:this={right_pane}>

  <div class="status-container">

      {#each launchfiles as launchfile}
<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
        <div
          role="button"
          tabindex="0"
          class="status-popup"
          class:running={launchfile.running && !launchfile.stopping}
          class:stopping={launchfile.stopping}
          on:click={() => {
            runStopLaunchfile(launchfile.running ? 'stop' : 'run', launchfile.domain, launchfile.launchfile)
          }}
        >
          {launchfile.domain} {launchfile.launchfile}
        </div>
      {/each}

  </div>

    <div class="toolbar">
      <button class:active={activeTool == 'move'} on:click={() => activeTool = 'move'}>
        <span>Move</span>
      </button>
      <button class:active={activeTool == 'box'} on:click={() => activeTool = 'box'}>
        <span>Box</span>
      </button>
    </div>

    {#if unsaved}
      <div class="save-container">
        <button on:click={saveChanges}>Save</button>
      </div>
    {/if}

  <Pannable bind:camera_coords={camera_coords} onwheel={(e) => {
    const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

    console.log($zoom_level)
    zoom_level.update($zoom_level => clamp($zoom_level - e.deltaY / 2000, 0.3, 1.1))

  }} on:contextmenu={() => show_canvas_menu = true} >

    <BackgroundGrid camera_coords={camera_coords} zoom_level={$zoom_level}/>
      {#each points as point (point.key)}
        <Point
          camera_coords={offset_coords}
          bind:x={point.x}
          bind:y={point.y}
          index={point.index}
          has_cone={point.has_cone}
          on:remove={index => removePoint(index.detail)}
          zoom_level={$zoom_level}
        />
      {/each}

      <Perse
        camera_coords={offset_coords}
        bind:x={perse_coords.x}
        bind:y={perse_coords.y}
        bind:angle={perse_coords.angle}
        zoom_level={$zoom_level}
      />

    </Pannable>


  </side>

  </Pane>
</Splitpanes>


</main>

  <ContextMenu bind:showModal={show_canvas_menu}>
  <ul class="canvas-contextmenu">

  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
  <li on:click={e => {
    addPoint(
      e.pageX - right_pane.offsetLeft - $offset_coords.x,
      e.pageY - right_pane.offsetTop - $offset_coords.y,
      false
    ) 
  }}>Adicionar Ponto</li>
  </ul>
  </ContextMenu>

  <Modal bind:showModal={show_reconnecting} enableClickOutside={false} >
    <h2>Reconectando</h2>
  </Modal>


<style>


main {
  display: flex;
  flex-direction: row;
  margin: 0;
  width: 100vw;
  height: 100vh;
}
  .canvas-contextmenu {
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

  side {
    background: none;
    width: 100%;
    height: 100%;

    &.left {
      border-right: none;
      background-color: #303030;
      z-index: 99;
      display: flex;
      flex-direction: column;

      &>#terminal-container {
        width: auto;
        height: 100%;
        resize: none;
        &>div {
          height: 100%;
        }
      }

      &>nav {
        background: #1D1D1D;
        padding: 10px;
        display: flex;
        justify-content: space-evenly;
        height: 20px;

        &>.active {
          font-weight: 600;
          color: white;
        }

        &>button {
          color: #dddddd;
          cursor: pointer;
          border: none;
          background: none;
          font-size: 1rem;
        }
        
      }

        
        &>h2 {
          font-family: Arial, Helvetica, sans-serif;
          align-self:center;
          color: #e3e3e3;
        }

        &>#pontos {
          overflow-y: auto;
        }
      
        &>#parametros .field {
          width: 100%;
          display: flex;
          font-family:Arial, Helvetica, sans-serif;
          text-align: right;
          gap: 10px;
          color: #e3e3e3;
          justify-content: center;


          &>* {
            flex: 1;
            max-width: 200px;
          }


        }

          & input[type=text] {
            background: #545454;
            border: none;
            margin-bottom: 1px;
            color: #e3e3e3;
            text-align: center;
            &:focus-visible {
              outline: none;
            }

            &.round_bottom {
              border-bottom-right-radius: 5px;
              border-bottom-left-radius: 5px;
            }
            &.round_top {
              border-top-right-radius: 5px;
              border-top-left-radius: 5px;
            }
          }

        
        &>#parametros, &>#pontos {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 20px;
          background: #3D3D3D;
          margin: 0 20px;
          border-radius: 5px;
        }

        &>#pontos .point {
          display: flex;
          flex-direction:column;
          font-family:Arial, Helvetica, sans-serif;
          align-items: center;
          width: 300px;

          &>.point-header {
            display: flex;
            padding-left: 20px;
            align-items: center;
            color: #e3e3e3;
            align-self: start;

            &>button {
              color: rgba(200, 0, 0, 1);
              margin-right: 10px;
              cursor: pointer;
              font-weight: 600;
              background-color: rgba(255, 0, 0, 0.1);
              border-radius: 50%;
              font-size: 15px;
              border: none;
              width: 30px;
              height: 30px;
              transition: background-color 150ms ease,border-radius 150ms ease;

              &:hover {
                background-color: rgba(255, 0, 0, 0.3);
                border-radius: 25%;
              }
            }
          }

          &>.sub-field {
            display: flex;
            color: #e3e3e3;
            width: 100%;
            text-align: end;
            gap: 10px;

            &>input {
              min-width: 100px;
            }

            &>* {
              flex: 1;
            }
          }

        }

      
    }


    &.right {
      flex: 1;
      position: relative;

      &>.status-container {
        display: flex;
        flex-direction: column;
        position: fixed;
        right: 40px;
        bottom: 40px;
        align-items: end;
        gap: 3px;
        z-index: 2;

        &>.run-stop-button {
          border: none;
          width: 50px;
          height: 50px;
          background: gray;
          display: grid;
          place-items: center;
          cursor: pointer;

          &:hover {
            background: rgb(60, 60, 60)
          }

        }

        &>.status-popup {
          font-size: 0.9rem;
          padding: 15px 10px;
          transition: background-color 0.3s;
          background-color: #3D3D3D;
          color: #e3e3e3;
          border-radius: 5px;
          cursor: pointer;
          border: 1.5px solid #525252;


          &.stopping {
            background-color: rgb(194 213 91);
            color: #22240d;
            border: solid 1.5px #5c571e;
          }
          &.running {
            background-color: rgb(50 161 79);
            color: #0d2413;
            border: solid 1.5px #1e5c1e;
          }
        }

      }

      &>.save-container {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 100px;
        height: 50px;

        &>button {
          display: grid;
          place-items: center;
          border: none;
          width: 100%;
          height: 100%;
          padding: 0px 10px;
          background: gray;
          cursor: pointer;

          &:hover {
            background: rgb(60, 60, 60)
          }
        }
      }

      &>.toolbar {
        position: fixed;
        margin-left: 20px;
        bottom: 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 60px;
        z-index: 2;

        &>button {
          display: grid;
          place-items: center;
          border: none;
          width: 100%;
          height: 40px;
          padding: 0px 10px;
          background: #545454;
          cursor: pointer;
          transition: background 100ms ease;

          &:hover {
            background: #5b5b5b
          }

          &.active {
            background: #4673B4;
            color: #e3e3e3;
          }


        }

      }

    }

  }


</style>
