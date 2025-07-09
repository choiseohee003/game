import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';

export const player = (() => {
  
  class Player {
    constructor(params) {
      this.position_ = new THREE.Vector3(0, 0, 0);
      this.velocity_ = 0.0;
      this.params_ = params;
      this.mesh_ = null;
      this.mixer_ = null;
      this.keys_ = params.keys; // 키 상태 참조
      this._targetRotation = new THREE.Quaternion();

      // 초기 모델 로드
      if (params.initialModelPath) {
        this.LoadModel_(params.initialModelPath);
      }
    }

    LoadModel_(modelPath) {
      if (this.mesh_) {
        this.params_.scene.remove(this.mesh_);
        this.mesh_ = null; // 기존 메쉬 제거 후 초기화
        if (this.mixer_) {
          this.mixer_.stopAllAction();
          this.mixer_ = null;
        }
      }

      const loader = new GLTFLoader();
      loader.load(modelPath, (gltf) => {
        console.log(`${modelPath} 모델 로드 완료:`, gltf);

        const model = gltf.scene;
        // 모델 파일명에 따라 scale 설정
        const modelFileName = modelPath.split('/').pop(); // 파일 이름만 추출
        switch (modelFileName) {
          case 'elephant.glb':
            model.scale.setScalar(10); // 코끼리 크게
            break;
          case 'giraffe.glb':
            model.scale.setScalar(8); // 기린 적당히
            break;
          case 'monkey.glb':
            model.scale.setScalar(5); // 원숭이 적당히
            break;
          case 'raccoon.glb':
            model.scale.setScalar(4); // 너구리
            break;
          default:
            model.scale.setScalar(4); // 기본
        }

        this.mesh_ = model;
        this.params_.scene.add(this.mesh_);

        this.mixer_ = new THREE.AnimationMixer(this.mesh_);
        gltf.animations.forEach((clip) => {
          this.mixer_.clipAction(clip).play();
        });

        // 모델의 바운딩 박스를 계산하여 Y축 위치 조정
        model.updateMatrixWorld(true); // 월드 변환 행렬 업데이트
        const bbox = new THREE.Box3().setFromObject(model);
        const yOffset = -bbox.min.y; // 모델의 최하단 Y 좌표를 0으로 맞추기 위한 오프셋

        this.mesh_.position.set(0, yOffset, 0);
        this.position_.copy(this.mesh_.position); // player의 position_도 업데이트

        console.log("✅ 3D 모델 로드 및 애니메이션 설정 완료");
      },
      undefined,
      (error) => {
        console.error(`🚨 ${modelPath} 모델 로드 실패:`, error);
        alert(`모델 파일을 찾을 수 없습니다: ${modelPath}. 'resources/Animal/' 폴더에 해당 파일을 추가하거나 player.js 파일에서 모델 파일명을 수정해주세요.`);
      });
    }

    Transform(modelPath) {
        console.log(`변신! 다음 모델: ${modelPath}`);
        this.LoadModel_(modelPath);
    }

    Update(timeElapsed) {
      const speed = 5; // 이동 속도

      if (!this.mesh_) return;

      const direction = new THREE.Vector3();
      const forward = new THREE.Vector3(0, 0, 1);
      const right = new THREE.Vector3(1, 0, 0);

      // 플레이어의 현재 회전을 가져옵니다.
      const currentRotation = this.mesh_.quaternion.clone();

      // 플레이어의 현재 방향을 기준으로 이동 벡터를 계산합니다.
      if (this.keys_.forward) direction.add(forward.clone().applyQuaternion(currentRotation));
      if (this.keys_.backward) direction.add(forward.clone().negate().applyQuaternion(currentRotation));
      if (this.keys_.left) direction.add(right.clone().applyQuaternion(currentRotation));
      if (this.keys_.right) direction.add(right.clone().negate().applyQuaternion(currentRotation));

      if (direction.lengthSq() > 0) {
        direction.normalize();
        direction.multiplyScalar(speed * timeElapsed);
        this.position_.add(direction);

        // 이동 방향에 따라 목표 회전값을 설정합니다.
        // 뒤로만 가는 경우 (backward 키만 눌린 경우) 회전하지 않음
        if (!(this.keys_.backward && !this.keys_.forward && !this.keys_.left && !this.keys_.right)) {
          const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().setY(0).normalize());
          this.mesh_.quaternion.slerp(targetQuaternion, 0.05); // 부드러운 회전
        }
      }

      if (this.mixer_) {
        this.mixer_.update(timeElapsed);
      }
      
      this.mesh_.position.copy(this.position_);
    }
  }

  return {
    Player: Player,
  };
})();