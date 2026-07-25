class IpadApp {
    socket;
    currentStep = 1;
    mainScene = null;
    // Step 1: Canvas 드로잉 요소
    canvas;
    ctx;
    isDrawing = false;
    brushColor = '#ff4757';
    brushSize = 16;
    isEraser = false;
    // Step 2: Form
    ownerName = '';
    // Step 3: Layout & Anchor
    posX = 0.5; // default center
    posY = 0.5;
    selectedAnchor = 'top';
    flowerDataUrl = '';
    constructor() {
        this.socket = io();
        this.initElements();
        this.initSocketEvents();
        this.initCanvasEvents();
        this.initStepEvents();
        this.initColorEvents();
        this.initLayoutDragEvents();
    }
    initElements() {
        this.canvas = document.getElementById('flower-canvas');
        this.ctx = this.canvas.getContext('2d');
        // Canvas 해상도 선명하게 조정
        this.canvas.width = 600;
        this.canvas.height = 600;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    initSocketEvents() {
        this.socket.on('init_data', (data) => {
            this.mainScene = data.mainScene;
            this.updateLayoutBackground();
            this.renderExistingFlowers();
        });
        this.socket.on('main_scene_changed', (scene) => {
            this.mainScene = scene;
            this.updateLayoutBackground();
            this.renderExistingFlowers();
        });
        this.socket.on('flower_added', (data) => {
            if (this.mainScene && data.sceneId === this.mainScene.id) {
                this.mainScene = data.scene;
                this.renderExistingFlowers();
            }
        });
        this.socket.on('scene_published', (scene) => {
            if (this.mainScene && scene.id === this.mainScene.id) {
                this.mainScene = scene;
                this.updateLayoutBackground();
                this.renderExistingFlowers();
            }
        });
    }
    // Canvas 드로잉 이벤트
    initCanvasEvents() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        };
        this.canvas.addEventListener('pointerdown', (e) => {
            this.isDrawing = true;
            const pos = getPos(e);
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        });
        this.canvas.addEventListener('pointermove', (e) => {
            if (!this.isDrawing)
                return;
            const pos = getPos(e);
            this.ctx.strokeStyle = this.isEraser ? 'rgba(0,0,0,1)' : this.brushColor;
            this.ctx.globalCompositeOperation = this.isEraser ? 'destination-out' : 'source-over';
            this.ctx.lineWidth = this.brushSize;
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        });
        const stopDrawing = () => {
            this.isDrawing = false;
        };
        this.canvas.addEventListener('pointerup', stopDrawing);
        this.canvas.addEventListener('pointerleave', stopDrawing);
        // 굵기 슬라이더
        const sizeInput = document.getElementById('brush-size');
        const sizeVal = document.getElementById('brush-size-val');
        sizeInput.addEventListener('input', () => {
            this.brushSize = Number(sizeInput.value);
            sizeVal.innerText = `${this.brushSize}px`;
        });
        // 펜 / 지우개 토글
        const penBtn = document.getElementById('tool-pen');
        const eraserBtn = document.getElementById('tool-eraser');
        penBtn.addEventListener('click', () => {
            this.isEraser = false;
            penBtn.classList.add('active');
            eraserBtn.classList.remove('active');
        });
        eraserBtn.addEventListener('click', () => {
            this.isEraser = true;
            eraserBtn.classList.add('active');
            penBtn.classList.remove('active');
        });
        // 초기화 버튼
        document.getElementById('btn-clear-canvas').addEventListener('click', () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        });
    }
    // 색상 팔레트 및 Color Picker 연동
    initColorEvents() {
        const allColorBtns = document.querySelectorAll('.color-btn');
        const colorBtns = document.querySelectorAll('.color-btn:not(#custom-color-btn)');
        const customBtn = document.getElementById('custom-color-btn');
        const nativePicker = document.getElementById('native-color-picker');
        // 🚨 디버깅용: 만약 요소를 찾지 못했다면 콘솔에 에러 표시
        if (!customBtn) {
            console.error("HTML에서 'custom-color-btn' id를 가진 요소를 찾을 수 없습니다.");
        }
        if (!nativePicker) {
            console.error("HTML에서 'native-color-picker' id를 가진 요소를 찾을 수 없습니다.");
        }
        // 1. 기본 색상 버튼 클릭
        colorBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                allColorBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.setBrushColor(btn.dataset.color || '#ff4757');
            });
        });
        // 2. 커스텀 Color Picker 버튼 이벤트 (Optional Chaining으로 null 방어)
        customBtn?.addEventListener('click', () => {
            allColorBtns.forEach((b) => b.classList.remove('active'));
            customBtn.classList.add('active');
            if (nativePicker) {
                this.setBrushColor(nativePicker.value);
                nativePicker.click();
            }
        });
        // 3. 네이티브 Color Picker 색상 변경 핸들러
        const handleColorChange = () => {
            if (!nativePicker)
                return;
            const selectedColor = nativePicker.value;
            allColorBtns.forEach((b) => b.classList.remove('active'));
            customBtn?.classList.add('active');
            if (customBtn)
                customBtn.style.borderColor = selectedColor;
            this.setBrushColor(selectedColor);
        };
        nativePicker?.addEventListener('input', handleColorChange);
        nativePicker?.addEventListener('change', handleColorChange);
    }
    // 💡 펜 모드 전환 및 색상 설정을 담당하는 헬퍼 메서드
    setBrushColor(color) {
        this.brushColor = color;
        this.isEraser = false;
        // Canvas Context가 클래스 멤버로 존재한다면 즉시 strokeStyle 업데이트
        if (this.ctx) {
            this.ctx.strokeStyle = color;
        }
        // 툴 UI 상태 업데이트
        const penTool = document.getElementById('tool-pen');
        const eraserTool = document.getElementById('tool-eraser');
        if (penTool)
            penTool.classList.add('active');
        if (eraserTool)
            eraserTool.classList.remove('active');
    }
    // 단계 이동 핸들링
    initStepEvents() {
        // Step 1 -> Step 2
        document.getElementById('btn-to-step2').addEventListener('click', () => {
            // 캔버스가 비어있는지 확인
            if (this.isCanvasEmpty()) {
                alert('꽃을 그려주신 후 다음 단계로 이동해주세요! 🌸');
                return;
            }
            this.flowerDataUrl = this.canvas.toDataURL('image/png');
            this.switchStep(2);
        });
        // Step 2 -> Step 1
        document.getElementById('btn-back-to-step1').addEventListener('click', () => {
            this.switchStep(1);
        });
        // Step 2 -> Step 3
        document.getElementById('btn-to-step3').addEventListener('click', () => {
            const nameInput = document.getElementById('owner-name');
            this.ownerName = nameInput.value.trim();
            if (!this.ownerName) {
                alert('기도자 또는 대상의 이름을 입력해 주세요!');
                return;
            }
            this.prepareStep3Layout();
            this.switchStep(3);
        });
        // Step 3 -> Step 2
        document.getElementById('btn-back-to-step2').addEventListener('click', () => {
            this.switchStep(2);
        });
        // Step 3 -> Confirm 모달
        document.getElementById('btn-open-confirm').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.add('active');
        });
        document.getElementById('btn-cancel-send').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.remove('active');
        });
        // 최종 확인 및 전송
        document.getElementById('btn-submit-flower').addEventListener('click', () => {
            this.submitFlower();
        });
    }
    isCanvasEmpty() {
        const pixelBuffer = new Uint32Array(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data.buffer);
        return !pixelBuffer.some((color) => color !== 0);
    }
    switchStep(step) {
        this.currentStep = step;
        document.querySelectorAll('.step-container').forEach((el) => el.classList.remove('active'));
        document.getElementById(`step-${step === 1 ? 'canvas' : step === 2 ? 'form' : 'layout'}`).classList.add('active');
        document.querySelectorAll('.step-item').forEach((el, idx) => {
            if (idx + 1 === step) {
                el.classList.add('active');
            }
            else {
                el.classList.remove('active');
            }
        });
    }
    // Step 3 렌더링 준비
    prepareStep3Layout() {
        const userImg = document.getElementById('user-flower-img');
        userImg.src = this.flowerDataUrl;
        const nameTag = document.getElementById('user-name-tag');
        nameTag.innerText = this.ownerName;
        nameTag.className = `name-tag anchor-${this.selectedAnchor}`;
        this.updateLayoutBackground();
        this.renderExistingFlowers();
    }
    // 미니 정원 배경 업데이트 (Admin의 Main Scene 배경 사용 / 없을 시 어두운 초록 그래디언트)
    updateLayoutBackground() {
        const viewport = document.getElementById('layout-garden-viewport');
        if (this.mainScene && this.mainScene.backgroundImage) {
            viewport.style.backgroundImage = `url(${this.mainScene.backgroundImage})`;
            viewport.classList.remove('fallback-gradient-bg');
        }
        else {
            viewport.style.backgroundImage = '';
            viewport.classList.add('fallback-gradient-bg');
        }
    }
    // 해당 씬의 기존 모든 꽃들 렌더링 (★ 필수 반영)
    renderExistingFlowers() {
        const layer = document.getElementById('existing-flowers-layer');
        layer.innerHTML = '';
        if (!this.mainScene || !this.mainScene.flowers)
            return;
        this.mainScene.flowers.forEach((flower) => {
            const flowerDiv = document.createElement('div');
            flowerDiv.className = 'existing-flower-item';
            flowerDiv.style.left = `${flower.posX * 100}%`;
            flowerDiv.style.top = `${flower.posY * 100}%`;
            const img = document.createElement('img');
            img.src = flower.image;
            const tag = document.createElement('div');
            tag.className = `name-tag anchor-${flower.nameAnchor}`;
            tag.innerText = flower.owner;
            flowerDiv.appendChild(img);
            flowerDiv.appendChild(tag);
            layer.appendChild(flowerDiv);
        });
    }
    // Layout 꽃 터치/마우스 드래그 & 3x3 9앵커 선택
    initLayoutDragEvents() {
        const dragItem = document.getElementById('user-flower-drag');
        const viewport = document.getElementById('layout-garden-viewport');
        let isDragging = false;
        const onPointerDown = (e) => {
            isDragging = true;
            dragItem.setPointerCapture(e.pointerId);
        };
        const onPointerMove = (e) => {
            if (!isDragging)
                return;
            const rect = viewport.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            // 뷰포트 영역 내 제한
            x = Math.max(0, Math.min(rect.width, x));
            y = Math.max(0, Math.min(rect.height, y));
            this.posX = x / rect.width;
            this.posY = y / rect.height;
            dragItem.style.left = `${this.posX * 100}%`;
            dragItem.style.top = `${this.posY * 100}%`;
        };
        const onPointerUp = (e) => {
            isDragging = false;
        };
        dragItem.addEventListener('pointerdown', onPointerDown);
        dragItem.addEventListener('pointermove', onPointerMove);
        dragItem.addEventListener('pointerup', onPointerUp);
        // 3x3 앵커 선택 그리드
        const anchorCells = document.querySelectorAll('.anchor-cell');
        anchorCells.forEach((cell) => {
            cell.addEventListener('click', () => {
                anchorCells.forEach((c) => c.classList.remove('active'));
                cell.classList.add('active');
                this.selectedAnchor = cell.dataset.anchor;
                const nameTag = document.getElementById('user-name-tag');
                nameTag.className = `name-tag anchor-${this.selectedAnchor}`;
            });
        });
    }
    // 서버로 데이터 전송
    submitFlower() {
        const flowerPayload = {
            image: this.flowerDataUrl,
            posX: this.posX,
            posY: this.posY,
            owner: this.ownerName,
            nameAnchor: this.selectedAnchor,
            sceneId: this.mainScene?.id,
        };
        this.socket.emit('submit_flower', flowerPayload);
        document.getElementById('confirm-modal').classList.remove('active');
        alert('🌸 아름다운 꽃과 기도의 이름이 정원에 피어났습니다!');
        // 캔버스 및 폼 초기화 후 Step 1로 이동
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        document.getElementById('owner-name').value = '';
        this.posX = 0.5;
        this.posY = 0.5;
        this.switchStep(1);
    }
}
window.addEventListener('DOMContentLoaded', () => {
    new IpadApp();
});
export {};
