// Ünlü yapıların minyatürleri (geçici iskelet).
import * as THREE from 'three';

export class Landmarks {
	constructor(G, tier, board) {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute([0, -5, 0, 0, -5, 0, 0, -5, 0], 3));
		this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
		this.caster = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
		this.count = 0;
	}
}
