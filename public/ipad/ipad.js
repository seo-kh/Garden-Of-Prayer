// 중보 대상을 생각하며, 중보의  정원에서 심고싶은 꽃을 그려주세요.


class IpadApp {
  #socket;
  #currentStep = 1;
  #mainScene = null;

  // Step 1: Canvas 드로잉 요소
  #canvas;
  #ctx;
  #isDrawing = false;
  #brushColor = '#ff4757';
  #brushSize = 16;
  #isEraser = false;

  // Step 2: Form
  #ownerName = '';

  // Step 3: Layout & Anchor
  #posX = 0.5; // default center
  #posY = 0.5;
  #selectedAnchor = 'top';
  #flowerDataUrl = '';

  constructor() {
    this.#socket = io();
    this.#initElements();
    this.#initSocketEvents();
    this.#initCanvasEvents();
    this.#initStepEvents();
    this.#initColorEvents();
    this.#initLayoutDragEvents();
  }

  #initElements() {
    this.#canvas = document.getElementById('flower-canvas');
    if (!this.#canvas) return;

    this.#ctx = this.#canvas.getContext('2d');

    // Canvas 해상도 선명하게 조정
    this.#canvas.width = 400;
    this.#canvas.height = 500;
    this.#ctx.lineCap = 'round';
    this.#ctx.lineJoin = 'round';
  }

  #initSocketEvents() {
    this.#socket.on('init_data', (data) => {
      this.#mainScene = data.mainScene;
      this.#updateLayoutBackground();
      this.#renderExistingFlowers();
    });

    this.#socket.on('main_scene_changed', (scene) => {
      this.#mainScene = scene;
      this.#updateLayoutBackground();
      this.#renderExistingFlowers();
    });

    this.#socket.on('flower_added', (data) => {
      if (this.#mainScene && data.sceneId === this.#mainScene.id) {
        this.#mainScene = data.scene;
        this.#renderExistingFlowers();
      }
    });

    this.#socket.on('scene_published', (scene) => {
      if (this.#mainScene && scene.id === this.#mainScene.id) {
        this.#mainScene = scene;
        this.#updateLayoutBackground();
        this.#renderExistingFlowers();
      }
    });
  }

  // Canvas 드로잉 이벤트
  #initCanvasEvents() {
    if (!this.#canvas || !this.#ctx) return;

    const getPos = (e) => {
      const rect = this.#canvas.getBoundingClientRect();
      const scaleX = this.#canvas.width / rect.width;
      const scaleY = this.#canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    this.#canvas.addEventListener('pointerdown', (e) => {
      this.#isDrawing = true;
      const pos = getPos(e);
      this.#ctx.beginPath();
      this.#ctx.moveTo(pos.x, pos.y);
    });

    this.#canvas.addEventListener('pointermove', (e) => {
      if (!this.#isDrawing) return;
      const pos = getPos(e);
      this.#ctx.strokeStyle = this.#isEraser ? 'rgba(0,0,0,1)' : this.#brushColor;
      this.#ctx.globalCompositeOperation = this.#isEraser ? 'destination-out' : 'source-over';
      this.#ctx.lineWidth = this.#brushSize;
      this.#ctx.lineTo(pos.x, pos.y);
      this.#ctx.stroke();
    });

    const stopDrawing = () => {
      this.#isDrawing = false;
    };

    this.#canvas.addEventListener('pointerup', stopDrawing);
    this.#canvas.addEventListener('pointerleave', stopDrawing);

    // 굵기 슬라이더
    const sizeInput = document.getElementById('brush-size');
    const sizeVal = document.getElementById('brush-size-val');
    if (sizeInput) {
      sizeInput.addEventListener('input', () => {
        this.#brushSize = Number(sizeInput.value);
        if (sizeVal) sizeVal.innerText = `${this.#brushSize}px`;
      });
    }

    // 펜 / 지우개 토글
    const penBtn = document.getElementById('tool-pen');
    const eraserBtn = document.getElementById('tool-eraser');

    if (penBtn) {
      penBtn.addEventListener('click', () => {
        this.#isEraser = false;
        penBtn.classList.add('active');
        if (eraserBtn) eraserBtn.classList.remove('active');
      });
    }

    if (eraserBtn) {
      eraserBtn.addEventListener('click', () => {
        this.#isEraser = true;
        eraserBtn.classList.add('active');
        if (penBtn) penBtn.classList.remove('active');
      });
    }

    // 초기화 버튼
    const clearBtn = document.getElementById('btn-clear-canvas');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
      });
    }
  }

  // 색상 팔레트 및 Color Picker 연동
  #initColorEvents() {
    const allColorBtns = document.querySelectorAll('.color-btn');
    const colorBtns = document.querySelectorAll('.color-btn:not(#custom-color-btn)');
    const customBtn = document.getElementById('custom-color-btn');
    const nativePicker = document.getElementById('native-color-picker');

    // 1. 기본 색상 팔레트 버튼 클릭
    colorBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        allColorBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const color = btn.dataset.color || '#ff4757';
        this.#setBrushColor(color);
      });
    });

    // 2. 커스텀 Color Picker 버튼 클릭 시 (label이 input을 알아서 클릭해주므로 active 스타일만 부여)
    customBtn?.addEventListener('click', () => {
      allColorBtns.forEach((b) => b.classList.remove('active'));
      customBtn.classList.add('active');

      if (nativePicker) {
        this.#setBrushColor(nativePicker.value);
      }
    });

    // 3. Color Picker 값 변경 시 (input: 실시간 드래그 / change: 선택 완료)
    const handleColorChange = () => {
      if (!nativePicker) return;
      const selectedColor = nativePicker.value;

      allColorBtns.forEach((b) => b.classList.remove('active'));
      customBtn?.classList.add('active');

      // 🎨 커스텀 버튼의 배경색을 선택한 색상으로 채우기!
      if (customBtn) {
        customBtn.style.background = selectedColor;
      }

      this.#setBrushColor(selectedColor);
    };

    nativePicker?.addEventListener('input', handleColorChange);
    nativePicker?.addEventListener('change', handleColorChange);
  }

  // 💡 펜 색상 변경 공통 헬퍼 메서드
  #setBrushColor(color) {
    this.#brushColor = color;
    this.#isEraser = false;

    // 캔버스 Context의 strokeStyle을 즉시 변경 (핵심!)
    if (this.#ctx) {
      this.#ctx.strokeStyle = color;
    }

    // 도구 모드 UI 업데이트 (펜 활성화 / 지우개 비활성화)
    const penTool = document.getElementById('tool-pen');
    const eraserTool = document.getElementById('tool-eraser');

    penTool?.classList.add('active');
    eraserTool?.classList.remove('active');
  }

  // 단계 이동 핸들링
  #initStepEvents() {
    // Step 1 -> Step 2
    document.getElementById('btn-to-step2')?.addEventListener('click', () => {
      // 캔버스가 비어있는지 확인
      if (this.#isCanvasEmpty()) {
        alert('꽃을 그려주신 후 다음 단계로 이동해주세요! 🌸');
        return;
      }
      this.#flowerDataUrl = this.#canvas.toDataURL('image/png');
      this.#switchStep(2);
    });

    // Step 2 -> Step 1
    document.getElementById('btn-back-to-step1')?.addEventListener('click', () => {
      this.#switchStep(1);
    });

    // Step 2 -> Step 3
    document.getElementById('btn-to-step3')?.addEventListener('click', () => {
      const nameInput = document.getElementById('owner-name');
      this.#ownerName = nameInput?.value.trim() || '';
      if (!this.#ownerName) {
        alert('기도자 또는 대상의 이름을 입력해 주세요!');
        return;
      }
      this.#prepareStep3Layout();
      this.#switchStep(3);
    });

    // Step 3 -> Step 2
    document.getElementById('btn-back-to-step2')?.addEventListener('click', () => {
      this.#switchStep(2);
    });

    // Step 3 -> Confirm 모달
    document.getElementById('btn-open-confirm')?.addEventListener('click', () => {
      document.getElementById('confirm-modal')?.classList.add('active');
    });

    document.getElementById('btn-cancel-send')?.addEventListener('click', () => {
      document.getElementById('confirm-modal')?.classList.remove('active');
    });

    // 최종 확인 및 전송
    document.getElementById('btn-submit-flower')?.addEventListener('click', () => {
      this.#submitFlower();
    });
  }

  #isCanvasEmpty() {
    if (!this.#canvas || !this.#ctx) return true;
    const pixelBuffer = new Uint32Array(
      this.#ctx.getImageData(0, 0, this.#canvas.width, this.#canvas.height).data.buffer
    );
    return !pixelBuffer.some((color) => color !== 0);
  }

  #switchStep(step) {
    this.#currentStep = step;
    document.querySelectorAll('.step-container').forEach((el) => el.classList.remove('active'));

    const stepId = step === 1 ? 'step-canvas' : step === 2 ? 'step-form' : 'step-layout';
    document.getElementById(stepId)?.classList.add('active');

    document.querySelectorAll('.step-item').forEach((el, idx) => {
      if (idx + 1 === step) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  // Step 3 렌더링 준비
  #prepareStep3Layout() {
    const userImg = document.getElementById('user-flower-img');
    if (userImg) userImg.src = this.#flowerDataUrl;

    const nameTag = document.getElementById('user-name-tag');
    if (nameTag) {
      nameTag.innerText = this.#ownerName;
      nameTag.className = `name-tag anchor-${this.#selectedAnchor}`;
    }

    this.#updateLayoutBackground();
    this.#renderExistingFlowers();

    // 💡 화면이 표시된 후 비디오 재생 강제 재시도 (Step 3 전환 직후)
    const video = document.querySelector('#layout-garden-viewport .bg-video');
    if (video) {
      video.play().catch((err) => {
        console.warn('Step3 비디오 재생 실패:', err);
      });
    }
  }

  // 💡 미니 정원 배경 업데이트 (이미지 / 비디오 모두 대응)
  #updateLayoutBackground() {
    const viewport = document.getElementById('layout-garden-viewport');
    if (!viewport) return;

    const bgUrl = this.#mainScene?.backgroundImage;

    // 기존 비디오 엘리먼트 제거
    const existingVideo = viewport.querySelector('.bg-video');

    if (bgUrl) {
      viewport.classList.remove('fallback-gradient-bg');

      if (this.#isVideoUrl(bgUrl)) {
        viewport.style.backgroundImage = '';

        // 비디오가 이미 동일한 src로 존재하는 경우 재생만 보장
        if (existingVideo && (existingVideo.src === bgUrl || existingVideo.currentSrc === bgUrl)) {
          existingVideo.play().catch(() => {});
          return;
        }

        if (existingVideo) {
          existingVideo.remove();
        }

        // 새로운 비디오 태그 생성
        const video = document.createElement('video');
        video.className = 'bg-video';
        video.src = bgUrl;

        // iPad / Safari 인라인 자동재생 필수 속성 세팅
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.volume = 0;
        video.playsInline = true;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('autoplay', '');
        video.setAttribute('loop', '');

        // 기존 layer 요소들보다 뒤(가장 앞의 자식)로 삽입
        viewport.insertBefore(video, viewport.firstChild);

        // 비디오 로드 완료 시 재생 시도
        video.onloadedmetadata = () => {
          video.play().catch((err) => {
            console.warn('비디오 play() 에러:', err);
          });
        };
      } else {
        // 이미지 배경
        if (existingVideo) existingVideo.remove();
        viewport.style.backgroundImage = `url("${bgUrl}")`;
        viewport.style.backgroundSize = 'contain';
        viewport.style.backgroundPosition = 'center';
        viewport.style.backgroundRepeat = 'no-repeat';
      }
    } else {
      // 배경 미지정 시
      if (existingVideo) existingVideo.remove();
      viewport.style.backgroundImage = '';
      viewport.classList.add('fallback-gradient-bg');
    }
  }

  // 비디오 확장자 감지 헬퍼 메서드
  #isVideoUrl(url) {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    const cleanUrl = url.split('?')[0].toLowerCase();
    return videoExtensions.some((ext) => cleanUrl.endsWith(ext));
  }

  // 해당 씬의 기존 모든 꽃들 렌더링
  #renderExistingFlowers() {
    const layer = document.getElementById('existing-flowers-layer');
    if (!layer) return;

    layer.innerHTML = '';

    if (!this.#mainScene || !this.#mainScene.flowers) return;

    this.#mainScene.flowers.forEach((flower) => {
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

  // Layout 꽃 터치/마우스 드래그 & 1x2 2앵커 선택
  #initLayoutDragEvents() {
    const dragItem = document.getElementById('user-flower-drag');
    const viewport = document.getElementById('layout-garden-viewport');

    if (!dragItem || !viewport) return;

    let isDragging = false;

    const onPointerDown = (e) => {
      isDragging = true;
      dragItem.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const rect = viewport.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // 뷰포트 영역 내 제한
      x = Math.max(0, Math.min(rect.width, x));
      y = Math.max(0, Math.min(rect.height, y));

      this.#posX = x / rect.width;
      this.#posY = y / rect.height;

      dragItem.style.left = `${this.#posX * 100}%`;
      dragItem.style.top = `${this.#posY * 100}%`;
    };

    const onPointerUp = () => {
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
        this.#selectedAnchor = cell.dataset.anchor || 'top';

        const nameTag = document.getElementById('user-name-tag');
        if (nameTag) {
          nameTag.className = `name-tag anchor-${this.#selectedAnchor}`;
        }
      });
    });
  }

  // 서버로 데이터 전송
  #submitFlower() {
    const flowerPayload = {
      image: this.#flowerDataUrl,
      posX: this.#posX,
      posY: this.#posY,
      owner: this.#ownerName,
      nameAnchor: this.#selectedAnchor,
      sceneId: this.#mainScene?.id,
    };

    this.#socket.emit('submit_flower', flowerPayload);

    document.getElementById('confirm-modal')?.classList.remove('active');
    alert('🌸 아름다운 꽃과 기도의 이름이 정원에 피어났습니다!');

    // 캔버스 및 폼 초기화 후 Step 1로 이동
    if (this.#canvas && this.#ctx) {
      this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    }
    const nameInput = document.getElementById('owner-name');
    if (nameInput) nameInput.value = '';

    this.#posX = 0.5;
    this.#posY = 0.5;
    this.#switchStep(1);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new IpadApp();
});