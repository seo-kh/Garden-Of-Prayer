class ProjectorApp {
    socket;
    currentMainScene = null;
    renderedFlowerIds = new Set();
    constructor() {
        this.socket = io();
        this.initSocketEvents();
    }
    initSocketEvents() {
        // 1. 서버 연결 시 초기 데이터 수신
        this.socket.on('init_data', (data) => {
            this.currentMainScene = data.mainScene;
            this.renderScene(this.currentMainScene);
        });
        // 2. 새로운 꽃 전송 수신 (실시간 피어남)
        this.socket.on('flower_added', (data) => {
            if (this.currentMainScene && data.sceneId === this.currentMainScene.id) {
                this.currentMainScene = data.scene;
                this.addFlowerWithAnimation(data.flower);
            }
        });
        // 3. 메인 씬 변경 수신
        this.socket.on('main_scene_changed', (scene) => {
            this.currentMainScene = scene;
            this.renderScene(this.currentMainScene);
        });
        // 4. 관리자 씬 게시 (Publish) 수신
        this.socket.on('scene_published', (scene) => {
            if (this.currentMainScene && scene.id === this.currentMainScene.id) {
                this.currentMainScene = scene;
                this.renderScene(this.currentMainScene);
            }
        });
    }
    // 씬 전체 렌더링 (배경 미디어 & 꽃 목록)
    renderScene(scene) {
        const bgContainer = document.getElementById('projector-bg');
        const flowerContainer = document.getElementById('projector-flowers');
        flowerContainer.innerHTML = '';
        this.renderedFlowerIds.clear();
        if (!scene) {
            bgContainer.innerHTML = '';
            bgContainer.className = 'projector-background fallback-gradient-bg';
            return;
        }
        // 배경 미디어 분기 처리 (이미지, GIF, 동영상)
        this.renderBackgroundMedia(scene.backgroundImage);
        // 해당 씬의 모든 꽃 렌더링
        if (scene.flowers && scene.flowers.length > 0) {
            scene.flowers.forEach((flower) => {
                this.addFlowerWithAnimation(flower, false);
            });
        }
    }
    // 배경 미디어 분기 (동영상 vs 이미지 vs GIF vs Fallback)
    renderBackgroundMedia(src) {
        const bgContainer = document.getElementById('projector-bg');
        bgContainer.innerHTML = '';
        if (!src || !src.trim()) {
            bgContainer.className = 'projector-background fallback-gradient-bg';
            return;
        }
        bgContainer.className = 'projector-background';
        const isVideo = src.startsWith('data:video') ||
            src.endsWith('.mp4') ||
            src.endsWith('.mov') ||
            src.endsWith('.webm');
        if (isVideo) {
            const videoEl = document.createElement('video');
            videoEl.src = src;
            videoEl.autoplay = true;
            videoEl.loop = true;
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.play().catch((err) => console.log('Video autoplay error:', err));
            bgContainer.appendChild(videoEl);
        }
        else {
            const imgEl = document.createElement('img');
            imgEl.src = src;
            imgEl.alt = '정원 배경';
            bgContainer.appendChild(imgEl);
        }
    }
    // 꽃 렌더링 & 피어남 애니메이션
    addFlowerWithAnimation(flower, isNew = true) {
        if (this.renderedFlowerIds.has(flower.id))
            return;
        this.renderedFlowerIds.add(flower.id);
        const flowerContainer = document.getElementById('projector-flowers');
        const flowerItem = document.createElement('div');
        flowerItem.className = 'projector-flower-item';
        flowerItem.style.left = `${flower.posX * 100}%`;
        flowerItem.style.top = `${flower.posY * 100}%`;
        // 신규 추가 시 애니메이션 재생
        if (!isNew) {
            flowerItem.style.animation = 'none';
            flowerItem.style.opacity = '1';
            flowerItem.style.transform = 'translate(-50%, -50%) scale(1)';
        }
        const img = document.createElement('img');
        img.src = flower.image;
        const tag = document.createElement('div');
        tag.className = `name-tag anchor-${flower.nameAnchor}`;
        tag.innerText = flower.owner;
        flowerItem.appendChild(img);
        flowerItem.appendChild(tag);
        flowerContainer.appendChild(flowerItem);
    }
}
window.addEventListener('DOMContentLoaded', () => {
    new ProjectorApp();
});
export {};
