class AdminSettingApp {
  #socket;
  #sceneId = null;
  #scene = null;
  #selectedFlower = null;

  constructor() {
    this.#socket = io();
    const urlParams = new URLSearchParams(window.location.search);
    this.#sceneId = urlParams.get('id');

    if (!this.#sceneId) {
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
      const res = await fetch(`/api/scenes/${this.#sceneId}`);
      const json = await res.json();
      if (json.success) {
        this.#scene = json.data;
        this.renderScene();
      }
    } catch (err) {
      console.error('Fetch scene error:', err);
    }
  }

  // 씬 렌더링
  renderScene() {
    if (!this.#scene) return;
    this.renderBackgroundMedia(this.#scene.backgroundImage);
    this.renderEditableFlowers();
  }

  renderBackgroundMedia(src) {
    const bgContainer = document.getElementById('admin-preview-bg');
    const viewport = document.getElementById('admin-preview-viewport');

    if (!bgContainer) return;
    bgContainer.innerHTML = '';

    if (!src || !src.trim()) {
      if (viewport) viewport.className = 'admin-preview-viewport fallback-gradient-bg';
      return;
    }

    if (viewport) viewport.className = 'admin-preview-viewport';

    const cleanSrc = src.split('?')[0].toLowerCase();
    const isVideo =
      src.startsWith('data:video') ||
      src.startsWith('blob:') ||
      /\.(mp4|mov|webm|ogg|m4v)$/i.test(cleanSrc);

    if (isVideo) {
      const videoEl = document.createElement('video');
      videoEl.src = src;
      videoEl.muted = true;
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('muted', '');
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('autoplay', '');
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'contain';
      videoEl.style.objectPosition = 'center';
      videoEl.style.display = 'block';

      bgContainer.appendChild(videoEl);
      videoEl.play().catch((err) => console.warn('[BG Media] Video play 실패:', err));
    } else {
      const imgEl = document.createElement('img');
      imgEl.src = src;
      imgEl.style.width = '100%';
      imgEl.style.height = '100%';
      imgEl.style.objectFit = 'contain';
      imgEl.style.objectPosition = 'center';
      imgEl.style.display = 'block';

      bgContainer.appendChild(imgEl);
    }
  }

  // 해당 씬의 꽃 렌더링
  renderEditableFlowers() {
    const layer = document.getElementById('admin-flowers-editable-layer');
    if (!layer) return;

    layer.innerHTML = '';
    if (!this.#scene || !this.#scene.flowers) return;

    this.#scene.flowers.forEach((flower) => {
      const flowerDiv = document.createElement('div');
      flowerDiv.className = 'admin-editable-flower';

      if (this.#selectedFlower && this.#selectedFlower.id === flower.id) {
        flowerDiv.classList.add('selected');
      }

      flowerDiv.style.left = `${flower.posX * 100}%`;
      flowerDiv.style.top = `${flower.posY * 100}%`;

      const img = document.createElement('img');
      img.src = flower.image;
      // 💡 이미지 기본 드래그 방지 (중요)
      img.draggable = false;

      const tag = document.createElement('div');
      tag.className = `name-tag anchor-${flower.nameAnchor}`;
      tag.innerText = flower.owner;

      flowerDiv.appendChild(img);
      flowerDiv.appendChild(tag);

      // 통합 상호작용 (클릭 선택 + 거리 기반 드래그)
      this.initFlowerInteraction(flowerDiv, flower);

      layer.appendChild(flowerDiv);
    });

    // 💡 배경 바탕 클릭 시에만 선택 해제 (꽃 클릭 이벤트 버블링 차단)
    const viewport = document.getElementById('admin-preview-viewport');
    if (viewport) {
      viewport.onclick = (e) => {
        // 클릭된 요소가 꽃 영역 안쪽이라면 해제하지 않음
        if (e.target.closest('.admin-editable-flower')) return;
        this.deselectFlower();
      };
    }
  }

  // 통합 꽃 상호작용 핸들러 (거리 기반 드래그 및 클릭 분리)
  initFlowerInteraction(element, flower) {
    const viewport = document.getElementById('admin-preview-viewport');
    if (!viewport) return;

    let isPointerDown = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    const DRAG_THRESHOLD = 5; // 5px 이상 움직이면 드래그 시작

    const onPointerDown = (e) => {
      // 마우스 좌클릭 / 터치만 허용
      if (e.button !== undefined && e.button !== 0) return;
      e.stopPropagation();

      isPointerDown = true;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!isPointerDown) return;

      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);

      // 5px 이상 움직인 경우 드래그 모드로 전환
      if (!isDragging && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
        isDragging = true;
        this.selectFlower(flower); // 드래그 시작 시 해당 꽃 선택
        element.classList.add('drag-mode');
      }

      // 드래그 중 좌표 이동
      if (isDragging) {
        const rect = viewport.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        x = Math.max(0, Math.min(rect.width, x));
        y = Math.max(0, Math.min(rect.height, y));

        flower.posX = x / rect.width;
        flower.posY = y / rect.height;

        element.style.left = `${flower.posX * 100}%`;
        element.style.top = `${flower.posY * 100}%`;
      }
    };

    const onPointerUp = (e) => {
      if (!isPointerDown) return;

      element.classList.remove('drag-mode');

      // 드래그를 하지 않고 떼었다면 단순 '클릭'으로 판별하여 선택 실행
      if (!isDragging) {
        this.selectFlower(flower);
      }

      isPointerDown = false;
      isDragging = false;

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    element.addEventListener('pointerdown', onPointerDown);
  }

  // 꽃 선택 (우측 패널 활성화)
  selectFlower(flower) {
    this.#selectedFlower = flower;

    // DOM을 다시 그리지 않고 선택된 클래스만 수정
    const layer = document.getElementById('admin-flowers-editable-layer');
    if (layer) {
      const allFlowers = layer.querySelectorAll('.admin-editable-flower');
      allFlowers.forEach((el) => el.classList.remove('selected'));
    }

    // 선택한 꽃에 selected 클래스 부여
    const targetFlowerEl = Array.from(layer?.querySelectorAll('.admin-editable-flower') || []).find((el) => {
      return el.style.left === `${flower.posX * 100}%` && el.style.top === `${flower.posY * 100}%`;
    });
    if (targetFlowerEl) {
      targetFlowerEl.classList.add('selected');
    }

    const panel = document.getElementById('flower-editor-panel');
    const msg = document.getElementById('no-flower-selected-msg');
    const ownerInput = document.getElementById('edit-flower-owner');

    if (panel) {
      panel.style.opacity = '1';
      panel.style.pointerEvents = 'auto';
    }
    if (msg) msg.style.display = 'none';

    if (ownerInput) ownerInput.value = flower.owner;

    // 앵커 버튼 선택 표시
    const anchorCells = document.querySelectorAll('#flower-editor-panel .anchor-cell');
    anchorCells.forEach((cell) => {
      if (cell.dataset.anchor === flower.nameAnchor) {
        cell.classList.add('active');
      } else {
        cell.classList.remove('active');
      }
    });
  }

  // 꽃 선택 해제
  deselectFlower() {
    this.#selectedFlower = null;

    const layer = document.getElementById('admin-flowers-editable-layer');
    if (layer) {
      const allFlowers = layer.querySelectorAll('.admin-editable-flower');
      allFlowers.forEach((el) => el.classList.remove('selected', 'drag-mode'));
    }

    const panel = document.getElementById('flower-editor-panel');
    const msg = document.getElementById('no-flower-selected-msg');

    if (panel) {
      panel.style.opacity = '0.5';
      panel.style.pointerEvents = 'none';
    }
    if (msg) msg.style.display = 'block';
  }

  // 우측 에디터 패널 이벤트
  initEditorEvents() {
    const ownerInput = document.getElementById('edit-flower-owner');
    if (ownerInput) {
      ownerInput.addEventListener('input', () => {
        if (this.#selectedFlower) {
          this.#selectedFlower.owner = ownerInput.value.trim() || '이름';
          // 이름 수정 시 태그 글자만 업데이트
          this.updateFlowerTagDOM(this.#selectedFlower);
        }
      });
    }

    const anchorCells = document.querySelectorAll('#flower-editor-panel .anchor-cell');
    anchorCells.forEach((cell) => {
      cell.addEventListener('click', () => {
        if (!this.#selectedFlower) return;
        anchorCells.forEach((c) => c.classList.remove('active'));
        cell.classList.add('active');
        this.#selectedFlower.nameAnchor = cell.dataset.anchor;
        this.updateFlowerTagDOM(this.#selectedFlower);
      });
    });
  }

  // 💡 DOM 재렌더링 없이 이름/앵커 변경 시 해당 꽃 태그만 빠르게 수정
  updateFlowerTagDOM(flower) {
    const layer = document.getElementById('admin-flowers-editable-layer');
    if (!layer) return;

    this.#scene?.flowers.forEach(() => {
      const selectedEl = layer.querySelector('.admin-editable-flower.selected');
      if (selectedEl) {
        const tag = selectedEl.querySelector('.name-tag');
        if (tag) {
          tag.className = `name-tag anchor-${flower.nameAnchor}`;
          tag.innerText = flower.owner;
        }
      }
    });
  }

  // 선택한 꽃 삭제 기능
  initDeleteModalEvents() {
    const deleteModal = document.getElementById('delete-flower-modal');
    const btnDelete = document.getElementById('btn-delete-selected-flower');
    const btnCancel = document.getElementById('btn-cancel-flower-delete');
    const btnConfirm = document.getElementById('btn-confirm-flower-delete');

    if (btnDelete && deleteModal) {
      btnDelete.addEventListener('click', () => {
        if (!this.#selectedFlower) return;
        deleteModal.classList.add('active');
      });
    }

    if (btnCancel && deleteModal) {
      btnCancel.addEventListener('click', () => {
        deleteModal.classList.remove('active');
      });
    }

    if (btnConfirm && deleteModal) {
      btnConfirm.addEventListener('click', () => {
        if (this.#scene && this.#selectedFlower) {
          this.#scene.flowers = this.#scene.flowers.filter((f) => f.id !== this.#selectedFlower.id);
          this.deselectFlower();
          deleteModal.classList.remove('active');
          this.renderEditableFlowers();
        }
      });
    }
  }

  initBgUploadEvents() {
    const fileInput = document.getElementById('bg-file-input');
    const selectBtn = document.getElementById('btn-select-bg');
    const resetBtn = document.getElementById('btn-reset-bg');

    if (selectBtn && fileInput) {
      selectBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (file) this.handleBgFile(file);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.#scene) {
          this.#scene.backgroundImage = '';
          this.renderBackgroundMedia('');
        }
      });
    }
  }

  handleBgFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (this.#scene && dataUrl) {
        this.#scene.backgroundImage = dataUrl;
        this.renderBackgroundMedia(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  initPublishModalEvents() {
    const publishModal = document.getElementById('publish-modal');
    const btnPublish = document.getElementById('btn-publish-scene');
    const btnCancel = document.getElementById('btn-cancel-publish');
    const btnConfirm = document.getElementById('btn-confirm-publish');

    if (btnPublish && publishModal) {
      btnPublish.addEventListener('click', () => {
        publishModal.classList.add('active');
      });
    }

    if (btnCancel && publishModal) {
      btnCancel.addEventListener('click', () => {
        publishModal.classList.remove('active');
      });
    }

    if (btnConfirm && publishModal) {
      btnConfirm.addEventListener('click', async () => {
        if (!this.#scene) return;

        try {
          const res = await fetch(`/api/scenes/${this.#scene.id}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              flowers: this.#scene.flowers,
              backgroundImage: this.#scene.backgroundImage,
            }),
          });

          const json = await res.json();
          if (json.success) {
            publishModal.classList.remove('active');
            alert('🚀 성공적으로 정원에 게시(Publish)되었습니다!');
          }
        } catch (err) {
          console.error('Publish scene error:', err);
        }
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AdminSettingApp();
});