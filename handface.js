const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const gestureDisplay = document.getElementById('gesture-display');
const warningOverlay = document.getElementById('warning-overlay');
const warningText = document.getElementById('warning-text');

let handDetector, faceDetector;

const fingerJoints = {
    thumb: { tip: 4, pip: 3 },
    index: { tip: 8, mcp: 5 },
    middle: { tip: 12, mcp: 9 },
    ring: { tip: 16, mcp: 13 },
    pinky: { tip: 20, mcp: 17 }
};

function countFingers(hand) {
    const landmarks = hand.keypoints;
    let extendedFingers = 0;
    const thumbTip = landmarks[fingerJoints.thumb.tip];
    const thumbPip = landmarks[fingerJoints.thumb.pip];
    if ((hand.handedness === 'Right' && thumbTip.x < thumbPip.x) || 
        (hand.handedness === 'Left' && thumbTip.x > thumbPip.x)) {
        extendedFingers++;
    }
    for (const finger of ['index', 'middle', 'ring', 'pinky']) {
        const tip = landmarks[fingerJoints[finger].tip];
        const mcp = landmarks[fingerJoints[finger].mcp];
        if (tip.y < mcp.y) {
            extendedFingers++;
        }
    }
    return extendedFingers;
}

function isPalmFacingCamera(hand) {
    const landmarks = hand.keypoints;
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];
    if (hand.handedness === 'Right') {
        return indexMcp.x < pinkyMcp.x;
    } else {
        return pinkyMcp.x < indexMcp.x;
    }
}

// Helper function to check for bounding box overlap
function checkOverlap(box1, box2, threshold = 0.5) {
    const xOverlap = Math.max(0, Math.min(box1.xMax, box2.xMax) - Math.max(box1.xMin, box2.xMin));
    const yOverlap = Math.max(0, Math.min(box1.yMax, box2.yMax) - Math.max(box1.yMin, box2.yMin));
    const intersectionArea = xOverlap * yOverlap;

    const box1Area = box1.width * box1.height;
    const box2Area = box2.width * box2.height;

    // Calculate overlap as a percentage of the smaller box's area
    const overlapRatio = intersectionArea / Math.min(box1Area, box2Area);
    return overlapRatio > threshold;
}

async function render() {
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const hands = await handDetector.estimateHands(video, { flipHorizontal: true });
        const faces = await faceDetector.estimateFaces(video, { flipHorizontal: true });
        
        const filteredFaces = faces.filter(face => {
            let isOverlappingWithHand = false;
            for (const hand of hands) {
                const handXCoords = hand.keypoints.map(kp => kp.x);
                const handYCoords = hand.keypoints.map(kp => kp.y);
                const handMinX = Math.min(...handXCoords);
                const handMaxX = Math.max(...handXCoords);
                const handMinY = Math.min(...handYCoords);
                const handMaxY = Math.max(...handYCoords);

                const handBox = {
                    xMin: handMinX,
                    yMin: handMinY,
                    xMax: handMaxX,
                    yMax: handMaxY,
                    width: handMaxX - handMinX,
                    height: handMaxY - handMinY
                };

                if (checkOverlap(face.box, handBox, 0.3)) {
                    isOverlappingWithHand = true;
                    break;
                }
            }
            return !isOverlappingWithHand;
        });

        if (filteredFaces.length > 0) {
            for (const face of filteredFaces) {
                ctx.beginPath();
                ctx.rect(face.box.xMin, face.box.yMin, face.box.width, face.box.height);
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.stroke();

                const leftEye = face.keypoints.find(k => k.name === 'leftEye');
                const rightEye = face.keypoints.find(k => k.name === 'rightEye');
                
                if(leftEye && rightEye) {
                    const yDiff = rightEye.y - leftEye.y;
                    const xDiff = rightEye.x - leftEye.x;
                    const angle = Math.atan2(yDiff, xDiff) * (180 / Math.PI);

                    let tiltDirection = '왼쪽으로 기울임';
                    const tiltThreshold = 5;

                    if (Math.abs(angle) > (180 - tiltThreshold)) {
                        tiltDirection = '중앙';
                    } else if (angle < 0) {
                        tiltDirection = '오른쪽으로 기울임';
                    }

                    const text = tiltDirection;
                    ctx.font = 'bold 18px Arial';
                    const textMetrics = ctx.measureText(text);
                    const textWidth = textMetrics.width;
                    const textHeight = 18; 
                    const padding = 5;

                    const x = face.box.xMin;
                    const y = face.box.yMin - textHeight - (padding * 2);

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(x, y, textWidth + (padding * 2), textHeight + (padding * 2));

                    ctx.fillStyle = 'yellow';
                    ctx.fillText(text, x + padding, y + textHeight + padding - 2);
                }
            }
        }

        if (hands.length > 0) {
            let totalFingers = 0;
            let allPalms = true;

            for (const hand of hands) {
                if (!isPalmFacingCamera(hand)) {
                    allPalms = false;
                    break;
                }
                totalFingers += countFingers(hand);
            }

            if (allPalms) {
                warningOverlay.style.display = 'none';
                gestureDisplay.innerText = `인식된 손가락: ${totalFingers}`;
                for (const hand of hands) {
                    window.HAND_CONNECTIONS.forEach(pair => {
                        const [start, end] = [hand.keypoints[pair[0]], hand.keypoints[pair[1]]];
                        ctx.beginPath();
                        ctx.moveTo(start.x, start.y);
                        ctx.lineTo(end.x, end.y);
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 3;
                        ctx.stroke();
                    });
                }
            } else {
                warningOverlay.style.display = 'flex';
                warningText.innerText = '손바닥을 보여주세요!';
                gestureDisplay.innerText = '경고: 손등 감지됨';
            }

        } else {
            warningOverlay.style.display = 'none';
            gestureDisplay.innerText = '손을 보여주세요!';
        }

    } catch (error) {
        console.error("렌더링 오류 발생:", error);
        // Optionally, display an error message to the user
        // gestureDisplay.innerText = '오류: 인식 중단';
    } finally {
        requestAnimationFrame(render);
    }
}

async function main() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await new Promise((resolve) => { video.onloadedmetadata = () => resolve(video); });
    
    [canvas.width, canvas.height] = [video.videoWidth, video.videoHeight];

    const handModel = handPoseDetection.SupportedModels.MediaPipeHands;
    handDetector = await handPoseDetection.createDetector(handModel, { 
        runtime: 'mediapipe', 
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands', 
        modelType: 'full', 
        maxHands: 2 
    });

    const faceModel = faceDetection.SupportedModels.MediaPipeFaceDetector;
    faceDetector = await faceDetection.createDetector(faceModel, {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
        modelType: 'short'
    });
    
    gestureDisplay.innerText = '준비 완료!';
    render();
  } catch (error) {
    console.error("오류 발생:", error);
    gestureDisplay.innerText = '카메라를 찾을 수 없습니다.';
  }
}

main();