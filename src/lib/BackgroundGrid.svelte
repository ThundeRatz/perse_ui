<script>
	import P5 from 'p5-svelte';

	export let gridSpacing = 30
	export let camera_coords;


	const sketch = (p5) => {
		p5.setup = () => {
			p5.createCanvas(400, 400);

			p5.stroke(0, 150)
			const resizeObserver = new ResizeObserver((entries) => {
				const entry = entries[0]

				const width=entry.contentRect.width
				const height=entry.contentRect.height
				p5.resizeCanvas(width, height);
			})
			resizeObserver.observe(canvas)
		};

		p5.draw = () => {
			p5.background('#393939')
			for(let i = -1; i < p5.width/gridSpacing+1; i++){
				p5.line(
					i*gridSpacing + ($camera_coords?.x||0)%gridSpacing, 0,
					i*gridSpacing + ($camera_coords?.x||0)%gridSpacing, p5.height
				)
			}
			for(let i = 0; i < p5.height/gridSpacing; i++){
				p5.line(
					0,        i*gridSpacing + ($camera_coords?.y||0)%gridSpacing,
					p5.width, i*gridSpacing + ($camera_coords?.y||0)%gridSpacing
				)
			}
		};

	};

	let canvas;


</script>

<div bind:this={canvas} class="canvas"></div>
<P5 {sketch} target={canvas}/>

<style>
	.canvas {
		width: 100%;
		height: 100%;
		position: absolute;
	user-select: none;
	z-index: -1;
	}
</style>
