"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Subtle floating-geometry backdrop for the hero. Loaded lazily (see
// hero-backdrop.tsx) — never on the critical path — and only on capable,
// reduced-motion-friendly, non-touch large screens. Caps DPR, pauses when the
// tab is hidden, and disposes everything on unmount to stay light.

type FloatingItem = {
  baseX: number;
  baseY: number;
  floatAmp: number;
  floatOffset: number;
  mesh: THREE.Mesh;
  spin: number;
};

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(4, 6, 8);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x9be7c6, 0.6);
    fillLight.position.set(-6, -2, 4);
    scene.add(fillLight);

    const palette = [0x13795b, 0x2fae84, 0x6750a4, 0xf0c98a, 0x9be7c6];
    const geometries: THREE.BufferGeometry[] = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TorusGeometry(0.7, 0.28, 16, 40),
    ];

    const group = new THREE.Group();
    const items: FloatingItem[] = [];
    const count = 7;

    for (let i = 0; i < count; i += 1) {
      const geometry = geometries[i % geometries.length];
      const material = new THREE.MeshStandardMaterial({
        color: palette[i % palette.length],
        flatShading: true,
        metalness: 0.12,
        roughness: 0.45,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const baseX = (Math.random() * 2 - 1) * 7;
      const baseY = (Math.random() * 2 - 1) * 4;
      mesh.position.set(baseX, baseY, (Math.random() * 2 - 1) * 2 - 1);
      mesh.scale.setScalar(0.5 + Math.random() * 0.9);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      group.add(mesh);
      items.push({
        baseX,
        baseY,
        floatAmp: 0.25 + Math.random() * 0.4,
        floatOffset: Math.random() * Math.PI * 2,
        mesh,
        spin: 0.1 + Math.random() * 0.25,
      });
    }
    scene.add(group);

    const pointer = { tx: 0, ty: 0, x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      pointer.tx = event.clientX / window.innerWidth - 0.5;
      pointer.ty = event.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onPointerMove);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) {
        return;
      }
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    let running = true;

    const renderFrame = () => {
      const elapsed = clock.getElapsedTime();
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      group.rotation.y = pointer.x * 0.4;
      group.rotation.x = pointer.y * 0.25;

      for (const item of items) {
        item.mesh.rotation.x += item.spin * 0.005;
        item.mesh.rotation.y += item.spin * 0.007;
        item.mesh.position.y =
          item.baseY + Math.sin(elapsed * item.spin + item.floatOffset) * item.floatAmp;
      }

      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!running) {
        return;
      }
      renderFrame();
      frame = requestAnimationFrame(loop);
    };
    loop();

    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        loop();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();
      for (const item of items) {
        (item.mesh.material as THREE.Material).dispose();
      }
      for (const geometry of geometries) {
        geometry.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div aria-hidden="true" className="absolute inset-0" ref={containerRef} />;
}
