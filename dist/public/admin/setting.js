class AdminSettingApp {
    socket;
    sceneId = null;
    scene = null;
    selectedFlower = null;
    constructor() {
        this.socket = io();
        const urlParams = new URLSearchParams(window.location.search);
        this.sceneId = urlParams.get('id');
        if (!this.sceneId) {
            alert('유효하지 않은 씬 ID입니다.');
            window.location.href = '/admin';
            return;
        }
        this.initBgUploadEvents();
        this.initEditorEvents();
        this.initDeleteModalEvents();
        this.initPublishModalEvents();
        this.fetchScene();
    }
    // 씬 데이터 가져오기
    async fetchScene() {
        try {
            const res = await fetch(`/api/scenes/${this.sceneId}`);
            const json = await res.json();
            if (json.success) {
                this.scene = json.data;
                this.renderScene();
            }
        }
        catch (err) {
            console.error('Fetch scene error:', err);
        }
    }
    // 씬 렌더링 (배경 + 모든 꽃 렌더링)
    renderScene() {
        if (!this.scene)
            return;
        // 배경 미디어 렌더링
        this.renderBackgroundMedia(this.scene.backgroundImage);
        // 해당 씬의 모든 꽃 렌더링 (★ 필수)
        this.renderEditableFlowers();
    }
    renderBackgroundMedia(src) {
        const bgContainer = document.getElementById('admin-preview-bg');
        const viewport = document.getElementById('admin-preview-viewport');
        bgContainer.innerHTML = '';
        if (!src || !src.trim()) {
            viewport.className = 'admin-preview-viewport fallback-gradient-bg';
            return;
        }
        viewport.className = 'admin-preview-viewport';
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
            // 🌟 가득 채우기 필수 스타일
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoEl.style.objectFit = 'contain';
            videoEl.style.objectPosition = 'center';
            videoEl.style.display = 'block';
            videoEl.play().catch((err) => console.log('Video error:', err));
            bgContainer.appendChild(videoEl);
        }
        else {
            const imgEl = document.createElement('img');
            imgEl.src = src;
            // 🌟 가득 채우기 필수 스타일
            imgEl.style.width = '100%';
            imgEl.style.height = '100%';
            imgEl.style.objectFit = 'contain';
            imgEl.style.objectPosition = 'center';
            imgEl.style.display = 'block';
            bgContainer.appendChild(imgEl);
        }
    }
    // 해당 씬에 배치된 모든 꽃들 렌더링 및 클릭 선택/드래그 이동
    renderEditableFlowers() {
        const layer = document.getElementById('admin-flowers-editable-layer');
        layer.innerHTML = '';
        if (!this.scene || !this.scene.flowers)
            return;
        this.scene.flowers.forEach((flower) => {
            const flowerDiv = document.createElement('div');
            flowerDiv.className = 'admin-editable-flower';
            if (this.selectedFlower && this.selectedFlower.id === flower.id) {
                flowerDiv.classList.add('selected');
            }
            flowerDiv.style.left = `${flower.posX * 100}%`;
            flowerDiv.style.top = `${flower.posY * 100}%`;
            const img = document.createElement('img');
            img.src = flower.image;
            const tag = document.createElement('div');
            tag.className = `name-tag anchor-${flower.nameAnchor}`;
            tag.innerText = flower.owner;
            flowerDiv.appendChild(img);
            flowerDiv.appendChild(tag);
            // 꽃 클릭 ➡️ 선택 상태 토글
            flowerDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectFlower(flower);
            });
            // 꽃 터치 / 마우스 드래그 이동
            this.initFlowerDrag(flowerDiv, flower);
            layer.appendChild(flowerDiv);
        });
        // 배경 바탕 클릭 시 선택 해제
        document.getElementById('admin-preview-viewport').addEventListener('click', () => {
            this.deselectFlower();
        });
    }
    // 꽃 드래그 이동 핸들링
    initFlowerDrag(element, flower) {
        let isDragging = false;
        const viewport = document.getElementById('admin-preview-viewport');
        element.addEventListener('pointerdown', (e) => {
            isDragging = true;
            element.setPointerCapture(e.pointerId);
            this.selectFlower(flower);
        });
        element.addEventListener('pointermove', (e) => {
            if (!isDragging)
                return;
            const rect = viewport.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            x = Math.max(0, Math.min(rect.width, x));
            y = Math.max(0, Math.min(rect.height, y));
            flower.posX = x / rect.width;
            flower.posY = y / rect.height;
            element.style.left = `${flower.posX * 100}%`;
            element.style.top = `${flower.posY * 100}%`;
        });
        element.addEventListener('pointerup', () => {
            isDragging = false;
        });
    }
    // 꽃 선택
    selectFlower(flower) {
        this.selectedFlower = flower;
        this.renderEditableFlowers();
        const panel = document.getElementById('flower-editor-panel');
        const msg = document.getElementById('no-flower-selected-msg');
        const ownerInput = document.getElementById('edit-flower-owner');
        panel.style.opacity = '1';
        panel.style.pointerEvents = 'auto';
        msg.style.display = 'none';
        ownerInput.value = flower.owner;
        // 앵커 버튼 선택 표시
        const anchorCells = document.querySelectorAll('#flower-editor-panel .anchor-cell');
        anchorCells.forEach((cell) => {
            if (cell.dataset.anchor === flower.nameAnchor) {
                cell.classList.add('active');
            }
            else {
                cell.classList.remove('active');
            }
        });
    }
    // 꽃 선택 해제
    deselectFlower() {
        this.selectedFlower = null;
        this.renderEditableFlowers();
        const panel = document.getElementById('flower-editor-panel');
        const msg = document.getElementById('no-flower-selected-msg');
        panel.style.opacity = '0.5';
        panel.style.pointerEvents = 'none';
        msg.style.display = 'block';
    }
    // 우측 에디터 패널 이벤트 (이름 & 앵커 수정)
    initEditorEvents() {
        const ownerInput = document.getElementById('edit-flower-owner');
        ownerInput.addEventListener('input', () => {
            if (this.selectedFlower) {
                this.selectedFlower.owner = ownerInput.value.trim() || '이름';
                this.renderEditableFlowers();
            }
        });
        const anchorCells = document.querySelectorAll('#flower-editor-panel .anchor-cell');
        anchorCells.forEach((cell) => {
            cell.addEventListener('click', () => {
                if (!this.selectedFlower)
                    return;
                anchorCells.forEach((c) => c.classList.remove('active'));
                cell.classList.add('active');
                this.selectedFlower.nameAnchor = cell.dataset.anchor;
                this.renderEditableFlowers();
            });
        });
    }
    // 선택한 꽃 삭제 기능 & 확인 모달 (★ 필수)
    initDeleteModalEvents() {
        const deleteModal = document.getElementById('delete-flower-modal');
        document.getElementById('btn-delete-selected-flower').addEventListener('click', () => {
            if (!this.selectedFlower)
                return;
            deleteModal.classList.add('active');
        });
        document.getElementById('btn-cancel-flower-delete').addEventListener('click', () => {
            deleteModal.classList.remove('active');
        });
        document.getElementById('btn-confirm-flower-delete').addEventListener('click', () => {
            if (this.scene && this.selectedFlower) {
                this.scene.flowers = this.scene.flowers.filter((f) => f.id !== this.selectedFlower.id);
                this.deselectFlower();
                deleteModal.classList.remove('active');
                this.renderEditableFlowers();
            }
        });
    }
    // 배경 미디어 업로드 및 파일 드래그 앤 드롭
    initBgUploadEvents() {
        const fileInput = document.getElementById('bg-file-input');
        const selectBtn = document.getElementById('btn-select-bg');
        const resetBtn = document.getElementById('btn-reset-bg');
        const viewport = document.getElementById('admin-preview-viewport');
        selectBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = fileInput.files?.[0];
            if (file)
                this.handleBgFile(file);
        });
        resetBtn.addEventListener('click', () => {
            if (this.scene) {
                this.scene.backgroundImage = '';
                this.renderBackgroundMedia('');
            }
        });
        // Drag & Drop
        viewport.addEventListener('dragover', (e) => e.preventDefault());
        viewport.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer?.files[0];
            if (file)
                this.handleBgFile(file);
        });
    }
    handleBgFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result;
            if (this.scene && dataUrl) {
                this.scene.backgroundImage = dataUrl;
                this.renderBackgroundMedia(dataUrl);
            }
        };
        reader.readAsDataURL(file);
    }
    // 게시 (Publish) 모달 및 승인 소켓 브로드캐스팅
    initPublishModalEvents() {
        const publishModal = document.getElementById('publish-modal');
        document.getElementById('btn-publish-scene').addEventListener('click', () => {
            publishModal.classList.add('active');
        });
        document.getElementById('btn-cancel-publish').addEventListener('click', () => {
            publishModal.classList.remove('active');
        });
        document.getElementById('btn-confirm-publish').addEventListener('click', async () => {
            if (!this.scene)
                return;
            try {
                const res = await fetch(`/api/scenes/${this.scene.id}/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        flowers: this.scene.flowers,
                        backgroundImage: this.scene.backgroundImage,
                    }),
                });
                const json = await res.json();
                if (json.success) {
                    publishModal.classList.remove('active');
                    alert('🚀 성공적으로 정원에 게시(Publish)되었습니다! 프로젝터 및 아이패드 화면에 반영됩니다.');
                }
            }
            catch (err) {
                console.error('Publish scene error:', err);
            }
        });
    }
}
window.addEventListener('DOMContentLoaded', () => {
    new AdminSettingApp();
});
export {};
