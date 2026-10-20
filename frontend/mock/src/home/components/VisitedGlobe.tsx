import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import waterMaskUrl from '../assets/earth-water.png';
import type { VisitedPlace } from '../types';

interface VisitedGlobeProps {
  places: VisitedPlace[];
  className?: string;
}

/** 仮: 配色。デザイン確定時はここを差し替える */
const COLORS = {
  ocean: '#99f6e4',
  land: '#ffffff',
  pin: '#f97316',
  pinStick: '#9a3412',
};

/** 行った所が無いときに見せる場所 (日本付近) */
const DEFAULT_FOCUS = { latitude: 36, longitude: 138 };
/** カメラと地球中心の距離 (地球半径 = 1)。横幅で地球のおよそ 1/8 (経度 45 度ほど) が見える */
const CAMERA_DISTANCE = 1.9;
/** この距離 (km) 以内のピンを同じかたまりとみなし、いちばん大きいかたまりを中心に映す */
const CLUSTER_RADIUS_KM = 1500;
const CLOUD_SPEED = 0.0004;
const LABEL_GAP = { x: 44, y: 16 };

/** 緯度経度を、three の SphereGeometry の UV (正距円筒図法) に合う単位球上の点に変換する */
const toVector = (latitude: number, longitude: number, radius = 1): THREE.Vector3 => {
  const phi = ((90 - latitude) * Math.PI) / 180;
  const theta = ((longitude + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.cos(theta) * Math.sin(phi),
    radius * Math.cos(phi),
    radius * Math.sin(theta) * Math.sin(phi)
  );
};

/** ピンがいちばん集まっている場所の方向。海外に 1 か所だけ行った旅でも、主な行き先が映るようにする */
const focusDirection = (places: VisitedPlace[]): THREE.Vector3 => {
  if (places.length === 0) return toVector(DEFAULT_FOCUS.latitude, DEFAULT_FOCUS.longitude);
  const vectors = places.map(p => toVector(p.latitude, p.longitude));
  const maxAngle = CLUSTER_RADIUS_KM / 6371;
  const clusters = vectors.map(v => vectors.filter(w => v.angleTo(w) <= maxAngle));
  const largest = clusters.reduce((a, b) => (b.length > a.length ? b : a));
  return largest.reduce((sum, v) => sum.add(v), new THREE.Vector3()).normalize();
};

/** 海陸マスク (海が白、境界はなめらかな濃淡) を読み込み、仮の配色で塗り直したテクスチャを作る */
const loadGlobeTexture = (onLoad: (texture: THREE.Texture) => void) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const ocean = new THREE.Color(COLORS.ocean);
    const land = new THREE.Color(COLORS.land);
    // マスクの濃淡で海と陸の色を補間し、ズームしても海岸線がギザギザにならないようにする
    const mixed = new THREE.Color();
    for (let i = 0; i < pixels.data.length; i += 4) {
      mixed.lerpColors(land, ocean, pixels.data[i] / 255);
      pixels.data[i] = mixed.r * 255;
      pixels.data[i + 1] = mixed.g * 255;
      pixels.data[i + 2] = mixed.b * 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    onLoad(texture);
  };
  image.src = waterMaskUrl;
};

/** ぼかした円を散らした、うっすらした雲のテクスチャ。左右の端でつながるよう両側に描く */
const createCloudTexture = (): THREE.Texture => {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (let i = 0; i < 320; i++) {
      const x = Math.random() * width;
      const y = height * (0.15 + Math.random() * 0.7);
      const r = 10 + Math.random() * 40;
      const alpha = 0.18 + Math.random() * 0.22;
      for (const dx of [-width, 0, width]) {
        const gradient = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x + dx, y, r * 1.8, r, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

/**
 * 仮: 行ったことのある場所にピンを立てた地球儀。ピンが集まる地域にズームした固定の視点で、雲だけゆっくり流れる。
 * ラベルは places と同じ順に並べた DOM を、毎フレーム直接動かす (React の再描画を挟まない)。
 */
export function VisitedGlobe({ places, className }: VisitedGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    const focus = focusDirection(places);
    camera.position.copy(focus).multiplyScalar(CAMERA_DISTANCE);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight('#ffffff', 2.4));
    const sun = new THREE.DirectionalLight('#ffffff', 0.9);
    sun.position.copy(camera.position).add(new THREE.Vector3(-1, 1.5, 0));
    scene.add(sun);

    const globeGeometry = new THREE.SphereGeometry(1, 96, 96);
    const globeMaterial = new THREE.MeshLambertMaterial({ color: COLORS.ocean });
    scene.add(new THREE.Mesh(globeGeometry, globeMaterial));
    loadGlobeTexture(texture => {
      globeMaterial.map = texture;
      globeMaterial.color.set('#ffffff');
      globeMaterial.needsUpdate = true;
    });

    const cloudTexture = createCloudTexture();
    const cloudGeometry = new THREE.SphereGeometry(1.012, 96, 96);
    const cloudMaterial = new THREE.MeshLambertMaterial({ map: cloudTexture, transparent: true, depthWrite: false });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(clouds);

    const headGeometry = new THREE.SphereGeometry(0.012, 16, 16);
    const stickGeometry = new THREE.CylinderGeometry(0.0025, 0.0025, 0.045, 8);
    stickGeometry.translate(0, 0.0225, 0);
    const headMaterial = new THREE.MeshLambertMaterial({ color: COLORS.pin });
    const stickMaterial = new THREE.MeshLambertMaterial({ color: COLORS.pinStick });
    const up = new THREE.Vector3(0, 1, 0);

    const pins = places.map(place => {
      const normal = toVector(place.latitude, place.longitude);
      const pin = new THREE.Group();
      pin.position.copy(normal);
      pin.quaternion.setFromUnitVectors(up, normal);
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 0.045;
      pin.add(new THREE.Mesh(stickGeometry, stickMaterial), head);
      scene.add(pin);
      return head;
    });

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const labels = container.querySelectorAll<HTMLSpanElement>('[data-globe-label]');
    const world = new THREE.Vector3();

    /** 画面内にあり、先に置いたラベルと重ならないものだけ表示する */
    const placeLabels = () => {
      const shown: { x: number; y: number }[] = [];
      pins.forEach((head, i) => {
        const label = labels[i];
        if (!label) return;
        head.getWorldPosition(world);
        const screen = world.project(camera);
        const x = ((screen.x + 1) / 2) * container.clientWidth;
        const y = ((1 - screen.y) / 2) * container.clientHeight;
        const inView = screen.z < 1 && x >= 0 && x <= container.clientWidth && y >= 0 && y <= container.clientHeight;
        const overlaps = shown.some(p => Math.abs(p.x - x) < LABEL_GAP.x && Math.abs(p.y - y) < LABEL_GAP.y);
        const visible = inView && !overlaps;
        if (visible) shown.push({ x, y });
        label.style.opacity = visible ? '1' : '0';
        label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -140%)`;
      });
    };

    let frame = 0;
    const render = () => {
      if (!reducedMotion) clouds.rotation.y += CLOUD_SPEED;
      renderer.render(scene, camera);
      placeLabels();
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      for (const disposable of [
        globeGeometry,
        globeMaterial,
        cloudGeometry,
        cloudMaterial,
        cloudTexture,
        headGeometry,
        stickGeometry,
        headMaterial,
        stickMaterial,
      ]) {
        disposable.dispose();
      }
      globeMaterial.map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [places]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {places.map(place => (
        <span
          key={place.tripId}
          data-globe-label
          className='pointer-events-none absolute top-0 left-0 whitespace-nowrap rounded-full bg-white/90 px-1.5 py-px font-medium text-10px text-gray-700 opacity-0 shadow-sm transition-opacity'
        >
          {place.name}
        </span>
      ))}
    </div>
  );
}
