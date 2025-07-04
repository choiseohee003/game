import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import { player } from './player.js';
import { math } from './math.js';

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  transform: false, // r 키 추가
};

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      keys.forward = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      keys.backward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      keys.left = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keys.right = true;
      break;
    case 'KeyR': // r 키 감지
      if (!keys.transform) { // 키를 누르고 있을 때 반복 호출 방지
        game.player_.Transform();
        keys.transform = true;
      }
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      keys.forward = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      keys.backward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      keys.left = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keys.right = false;
      break;
    case 'KeyR': // r 키 떼면 상태 초기화
      keys.transform = false;
      break;
  }
});

// 하늘 셰이더 (생략 가능, 기존 그대로 붙여넣기)
const SKY_VERTEX_SHADER = ` ... 기존 코드 ... `;
const SKY_FRAGMENT_SHADER = ` ... 기존 코드 ... `;

class GameStage3 {
  constructor() {
    this.Initialize();
    this.RAF();
  }

  Initialize() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.gammaFactor = 2.2;

    document.getElementById('container').appendChild(this.renderer.domElement);

    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 1.0;
    const far = 2000.0;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(-8, 6, 12);
    this.camera.lookAt(0, 2, 0);

    this.scene = new THREE.Scene();

    this.SetupLighting();
    this.SetupSkyAndFog();
    this.CreateGround();
    this.LoadClouds();
    this.CreatePillars();

    // 키 상태를 플레이어에 전달
    this.player_ = new player.Player({
      scene: this.scene,
      keys: keys,
    });

    window.addEventListener('resize', () => this.OnWindowResize(), false);
  }

  SetupLighting() {
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 2.5);
    directionalLight.position.set(60, 100, 10);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.bias = -0.001;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1.0;
    directionalLight.shadow.camera.far = 200.0;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0xF6F47F, 1.5);
    this.scene.add(hemisphereLight);

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
    this.scene.add(ambientLight);

    console.log("✅ 조명 시스템 설정 완료");
  }

  SetupSkyAndFog() {
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 100, 200);
    console.log("✅ 하늘 배경 및 안개 설정 완료");
  }

  CreateGround() {
    const groundGeometry = new THREE.PlaneGeometry(500, 500, 10, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xF6F47F });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    console.log("✅ 지면 생성 완료");
  }

  LoadClouds() {
    const loader = new GLTFLoader();
    const cloudPaths = [
      './resources/Clouds/GLTF/Cloud1.glb',
      './resources/Clouds/GLTF/Cloud2.glb',
      './resources/Clouds/GLTF/Cloud3.glb'
    ];

    for (const path of cloudPaths) {
      loader.load(path, (gltf) => {
        const cloud = gltf.scene;
        cloud.scale.set(10, 10, 10);
        cloud.position.set(
          (Math.random() - 0.5) * 400,
          Math.random() * 50 + 50,
          (Math.random() - 0.5) * 400
        );
        this.scene.add(cloud);
      });
    }
    console.log("✅ 구름 모델 로드 완료");
  }

  CreatePillars() {
    const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 32);
    const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // SaddleBrown

    const pillarPositions = [
      new THREE.Vector3(5, 5, 5),
      new THREE.Vector3(-5, 5, 5),
      new THREE.Vector3(5, 5, -5),
      new THREE.Vector3(-5, 5, -5),
    ];

    pillarPositions.forEach(pos => {
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.copy(pos);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
    });
    console.log("✅ 기둥 4개 생성 완료");
  }

  OnWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  RAF(time) {
    requestAnimationFrame((t) => this.RAF(t));
    if (!this.prevTime) this.prevTime = time || performance.now();
    const delta = ((time || performance.now()) - this.prevTime) * 0.001;
    this.prevTime = time || performance.now();

    if (this.player_) {
      this.player_.Update(delta);
      this.UpdateCamera_(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }

  UpdateCamera_(delta) {
    if (!this.player_.mesh_) return;

    const playerPosition = this.player_.position_;
    const cameraOffset = new THREE.Vector3(0, 5, -12); // 카메라와 플레이어의 거리

    // 플레이어의 회전값을 고려하여 카메라 위치 계산
    const playerRotation = new THREE.Quaternion();
    this.player_.mesh_.getWorldQuaternion(playerRotation);
    cameraOffset.applyQuaternion(playerRotation);

    const cameraPosition = playerPosition.clone().add(cameraOffset);

    this.camera.position.lerp(cameraPosition, 0.1); // 부드러운 이동
    this.camera.lookAt(playerPosition); // 항상 플레이어를 바라보도록 설정
  }
}

let game = null;
window.addEventListener('DOMContentLoaded', () => {
  game = new GameStage3();
  console.log("🎮 3단계 게임 초기화 완료!");
  console.log("🦕 3D 공룡 모델 로드 중...");
});
