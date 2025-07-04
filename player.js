import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';

export const player = (() => {
  
  class Player {
    constructor(params) {
      this.position_ = new THREE.Vector3(0, 3.2, 0);
      this.velocity_ = 0.0;
      this.params_ = params;
      this.mesh_ = null;
      this.mixer_ = null;
      this.keys_ = params.keys; // 키 상태 참조
      this.isTransformed_ = false; // 변신 상태
      this._targetRotation = new THREE.Quaternion();

      this.LoadModel_();
    }

    LoadModel_() {
      // 참고: test.glb는 예시 파일명입니다. resources/Animal/ 폴더에 원하는 모델을 넣고 파일명을 수정하세요.
      const modelFile = this.isTransformed_ ? 'elephant.glb' : 'raccoon.glb';
      
      if (this.mesh_) {
        this.params_.scene.remove(this.mesh_);
      }

      const loader = new GLTFLoader();
      loader.setPath('./resources/Animal/');
      loader.load(modelFile, (gltf) => {
        console.log(`${modelFile} 모델 로드 완료:`, gltf);

        const model = gltf.scene;
        // 동물 모델 파일명에 따라 scale 설정
        switch (modelFile) {
          case 'elephant.glb':
            model.scale.setScalar(8); // 코끼리 크게
            break;
          case 'monkey.glb':
            model.scale.setScalar(5); // 원숭이 적당히
            break;
          default:
            model.scale.setScalar(4); // 기본 (예: 너구리)
        }

        this.mesh_ = model;
        this.params_.scene.add(this.mesh_);
        this.mesh_.position.copy(this.position_);

        model.traverse(c => {
          let materials = c.material;
          if (!(c.material instanceof Array)) {
            materials = [c.material];
          }

          for (let m of materials) {
            if (m) {
              // 기본 재질의 specular 값을 유지하여 빛 반사를 허용합니다.
              if (m.color) m.color.offsetHSL(0, 0, 0.2);
            }
          }

          c.castShadow = true;
          c.receiveShadow = true;
        });

        this.mixer_ = new THREE.AnimationMixer(model);

        if (gltf.animations.length > 0) {
          // 가장 첫 번째 애니메이션을 재생합니다.
          const clip = gltf.animations[0];
          const action = this.mixer_.clipAction(clip);
          action.play();
          console.log(`애니메이션 '${clip.name}' 재생 시작`);
        }

        console.log("애니메이션 목록:", gltf.animations.map(a => a.name));
      },
      undefined,
      (error) => {
        console.error(`🚨 ${modelFile} 모델 로드 실패:`, error);
        if (this.isTransformed_) {
            alert("두 번째 모델 파일을 찾을 수 없습니다. 'resources/Animal/' 폴더에 'test.glb' 파일을 추가하거나 player.js 파일에서 모델 파일명을 수정해주세요.");
            this.isTransformed_ = false; // 에러 발생 시 원래 상태로 복귀
        }
      });
    }

    Transform() {
        this.isTransformed_ = !this.isTransformed_;
        console.log(`변신! 현재 모델: ${this.isTransformed_ ? 'elephant.glb' : 'raccoon.glb'}`);
        this.LoadModel_();
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