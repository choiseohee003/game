// game.js - 3D 게임 환경 및 로직을 관리하는 메인 스크립트

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import { player } from './player.js'; // Player 클래스 임포트

// 키 상태를 저장하는 객체
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

/**
 * Game 클래스는 Three.js 씬, 카메라, 렌더러, 조명, 플레이어 및 게임 루프를 관리합니다.
 */
class Game {
  constructor() {
    this.Initialize(); // 게임 초기화
    this.RAF(); // 렌더링 루프 시작
  }

  /**
   * 게임 환경을 초기화합니다.
   * 렌더러, 카메라, 씬 설정, 조명, 하늘, 지면 생성 및 이벤트 리스너를 추가합니다.
   */
  Initialize() {
    // WebGL 렌더러 설정
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true; // 그림자 활성화
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.gammaFactor = 2.2; // 부드러운 그림자 타입
    document.getElementById('game-container').appendChild(this.renderer.domElement);

    // FPS 디스플레이 요소 가져오기
    this.fpsDisplay = document.getElementById('fps-display');
    this.lastFpsUpdateTime = performance.now();
    this.frameCount = 0;

    // 카메라 설정
    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 1.0;
    const far = 2000.0;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(-8, 6, 12);

    // 씬 생성
    this.scene = new THREE.Scene();

    this.SetupLighting(); // 조명 설정
    this.SetupSkyAndFog(); // 하늘 및 안개 설정
    this.CreateGround(); // 지면 생성
    this.LoadPillars(); // 기둥 로드 및 배치

    // 플레이어 인스턴스 생성
    this.player_ = new player.Player({
      scene: this.scene,
      keys: keys,
      initialModelPath: './resources/Animal/raccoon.glb', // 너구리 모델 경로
    });

    // 이벤트 리스너 등록
    window.addEventListener('resize', () => this.OnWindowResize(), false);
    window.addEventListener('keydown', (e) => this.OnKeyDown(e), false);
    window.addEventListener('keyup', (e) => this.OnKeyUp(e), false);
  }

  /**
   * 키보드 누름 이벤트 핸들러입니다.
   * @param {KeyboardEvent} event - 키보드 이벤트 객체
   */
  OnKeyDown(event) {
      switch (event.code) {
          case 'ArrowUp':
          case 'KeyW': keys.forward = true; break;
          case 'ArrowLeft':
          case 'KeyA': keys.left = true; break;
          case 'ArrowDown':
          case 'KeyS': keys.backward = true; break;
          case 'ArrowRight':
          case 'KeyD': keys.right = true; break;
      }
  }

  /**
   * 키보드 떼기 이벤트 핸들러입니다.
   * @param {KeyboardEvent} event - 키보드 이벤트 객체
   */
  OnKeyUp(event) {
      switch (event.code) {
          case 'ArrowUp':
          case 'KeyW': keys.forward = false; break;
          case 'ArrowLeft':
          case 'KeyA': keys.left = false; break;
          case 'ArrowDown':
          case 'KeyS': keys.backward = false; break;
          case 'ArrowRight':
          case 'KeyD': keys.right = false; break;
      }
  }

  /**
   * 씬의 조명을 설정합니다.
   * DirectionalLight (태양광), HemisphereLight (하늘/지면), AmbientLight (전역 조명)를 추가합니다.
   */
  SetupLighting() {
    // 태양광 (DirectionalLight)
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

    // 반구형 조명 (HemisphereLight) - 하늘색과 지면색
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x111111, 1.5); // 지면색을 매우 어두운 회색으로 변경하여 색상 영향 최소화
    this.scene.add(hemisphereLight);

    // 전역 조명 (AmbientLight)
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
    this.scene.add(ambientLight);
  }

  /**
   * 씬의 배경색과 안개를 설정합니다.
   */
  SetupSkyAndFog() {
    this.scene.background = new THREE.Color(0x87CEEB); // 하늘색 배경
    this.scene.fog = new THREE.Fog(0x87CEEB, 100, 200); // 안개 설정
  }

  /**
   * 지면을 생성하고 씬에 추가합니다.
   */
  CreateGround() {
    const groundGeometry = new THREE.PlaneGeometry(250, 250, 10, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x32CD32 }); // 지면색을 연한 초록색으로 변경
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2; // X축으로 90도 회전하여 평면으로 만듦
    this.ground.position.y = 0;
    this.ground.receiveShadow = true; // 그림자 받기 활성화
    this.scene.add(this.ground);
  }

  /**
   * 기둥 모델을 로드하고 씬에 배치합니다.
   */
  LoadPillars() {
    const loader = new GLTFLoader();
    const pillarPositions = [
      new THREE.Vector3(10, 0, 10),
      new THREE.Vector3(-10, 0, 10),
      new THREE.Vector3(10, 0, -10),
      new THREE.Vector3(-10, 0, -10),
    ];

    pillarPositions.forEach(pos => {
      loader.load('./resources/Clouds/GLTF/Cloud1.glb', (gltf) => {
        gltf.scene.traverse(c => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        gltf.scene.position.copy(pos);
        gltf.scene.scale.set(5, 5, 5); // Adjust scale as needed
        this.scene.add(gltf.scene);
      });
    });
  }

  /**
   * 창 크기 변경 시 렌더러와 카메라를 업데이트합니다.
   */
  OnWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * 렌더링 애니메이션 프레임 루프를 시작합니다.
   */
  RAF() {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      }
      this.RAF(); // 다음 프레임 요청
      this.renderer.render(this.scene, this.camera); // 씬 렌더링
      this.Step(t - this.previousRAF_); // 게임 로직 업데이트
      this.previousRAF_ = t;

      // FPS 계산 및 업데이트
      this.frameCount++;
      const now = performance.now();
      if (now >= this.lastFpsUpdateTime + 1000) {
        const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdateTime));
        if (this.fpsDisplay) {
          this.fpsDisplay.textContent = `FPS: ${fps}`;
        }
        this.frameCount = 0;
        this.lastFpsUpdateTime = now;
      }
    });
  }
  
  /**
   * 게임 로직을 업데이트합니다.
   * @param {number} timeElapsed - 마지막 업데이트 이후 경과된 시간 (밀리초)
   */
  Step(timeElapsed) {
      const timeElapsedS = timeElapsed * 0.001; // 초 단위로 변환
      if (this.player_) {
          this.player_.Update(timeElapsedS); // 플레이어 업데이트
          this.UpdateCamera_(timeElapsedS); // 카메라 업데이트
      }
  }

  /**
   * 카메라 위치를 플레이어에 따라 업데이트합니다.
   * @param {number} delta - 업데이트 시간 간격
   */
  UpdateCamera_(delta) {
      if (!this.player_.mesh_) return; // 플레이어 메시가 없으면 업데이트하지 않음

      const playerPosition = this.player_.position_; // 플레이어 현재 위치
      const cameraOffset = new THREE.Vector3(0, 5, -12); // 카메라 오프셋

      // 플레이어 회전에 따라 카메라 오프셋 회전
      const playerRotation = new THREE.Quaternion();
      this.player_.mesh_.getWorldQuaternion(playerRotation);
      cameraOffset.applyQuaternion(playerRotation);

      const cameraPosition = playerPosition.clone().add(cameraOffset); // 최종 카메라 위치
      
      const lerpFactor = 0.1; // 보간 계수
      this.camera.position.lerp(cameraPosition, lerpFactor); // 카메라 위치 보간
      
      const lookAtPosition = playerPosition.clone().add(new THREE.Vector3(0, 2, 0)); // 카메라가 바라볼 위치
      this.camera.lookAt(lookAtPosition); // 카메라 바라보기
  }
}

let _APP = null; // 게임 인스턴스

// DOMContentLoaded 이벤트 발생 시 게임 초기화
window.addEventListener('DOMContentLoaded', () => {
  // Three.js 라이브러리가 로드되었는지 확인
  if (typeof THREE !== 'undefined') {
    _APP = new Game(); // 게임 시작
  } else {
    // Three.js 로드 실패 시 메시지 표시
    document.getElementById('game-container').innerHTML = '<p style="color: red; text-align: center; margin-top: 50px;">Three.js 라이브러리를 로드하지 못했습니다.</p>';
  }
});
