import { writable } from 'svelte/store';

export const mouse_coords = writable({
	x: 0,
	y: 0
});


window.addEventListener('mousemove', e => {
	mouse_coords.update(() => ({
		x: e.x,
		y: e.y
	}))
})

