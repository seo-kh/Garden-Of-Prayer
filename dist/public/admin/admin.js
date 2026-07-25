class AdminMainApp {
    socket;
    scenes = [];
    selectedSceneForCtx = null;
    constructor() {
        this.socket = io();
        this.initSocketEvents();
        this.initContextMenuEvents();
        this.initCreateModalEvents();
        this.fetchScenes();
    }
    initSocketEvents() {
        this.socket.on('scene_created', () => this.fetchScenes());
        this.socket.on('scene_updated', () => this.fetchScenes());
        this.socket.on('main_scene_changed', () => this.fetchScenes());
        this.socket.on('scene_deleted', () => this.fetchScenes());
        this.socket.on('scene_published', () => this.fetchScenes());
    }
    // REST API로 모든 씬 목록 가져오기
    async fetchScenes() {
        try {
            const res = await fetch('/api/scenes');
            const json = await res.json();
            if (json.success) {
                this.scenes = json.data;
                this.renderGrid();
            }
        }
        catch (err) {
            console.error('Fetch scenes error:', err);
        }
    }
    // 3열 그리드 씬 카드 렌더링 (생성일 오름차순)
    renderGrid() {
        const grid = document.getElementById('scene-grid');
        grid.innerHTML = '';
        // 생성 날짜 기준 오름차순 정렬
        const sortedScenes = [...this.scenes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        sortedScenes.forEach((scene) => {
            const card = document.createElement('div');
            card.className = 'scene-card';
            card.dataset.id = scene.id;
            // 메인 씬일 경우 노란색 별표(★) 배지 노출
            let starHtml = '';
            if (scene.isMain) {
                starHtml = `<div class="main-scene-star" title="현재 메인 씬">★</div>`;
            }
            // 배경 미디어 (없거나 에러 시 어두운 초록 그래디언트)
            let previewBg = '';
            if (scene.backgroundImage) {
                previewBg = `background-image: url(${scene.backgroundImage});`;
            }
            else {
                card.classList.add('fallback-gradient-bg');
            }
            card.innerHTML = `
        ${starHtml}
        <div class="scene-card-preview" style="${previewBg}"></div>
        <div class="scene-card-info">
          <div>
            <div class="scene-card-name">${scene.name}</div>
            <div class="scene-card-date">${new Date(scene.createdAt).toLocaleDateString()}</div>
          </div>
          <span style="font-size: 0.85rem; color: var(--primary-gold);">꽃 ${scene.flowers ? scene.flowers.length : 0}개 🌸</span>
        </div>
      `;
            // 클릭 시 씬 상세 설정 화면으로 이동
            card.addEventListener('click', (e) => {
                // 우클릭 이벤트 중복 차단
                if (e.button === 2)
                    return;
                window.location.href = `/admin/setting?id=${scene.id}`;
            });
            // 우클릭 시 커스텀 드롭다운 메뉴 오픈
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.selectedSceneForCtx = scene;
                this.openContextMenu(e.clientX, e.clientY);
            });
            grid.appendChild(card);
        });
    }
    // 우클릭 커스텀 드롭다운 메뉴 핸들링
    // admin.ts
    openContextMenu(x, y) {
        const menu = document.getElementById('admin-context-menu');
        // 화면 크기를 벗어나지 않도록 좌표 보정
        const menuWidth = 180;
        const menuHeight = 120;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const adjustedX = x + menuWidth > screenWidth ? x - menuWidth : x;
        const adjustedY = y + menuHeight > screenHeight ? y - menuHeight : y;
        menu.style.left = `${adjustedX}px`;
        menu.style.top = `${adjustedY}px`;
        menu.style.display = 'block';
    }
    closeContextMenu() {
        const menu = document.getElementById('admin-context-menu');
        menu.style.display = 'none';
    }
    initContextMenuEvents() {
        document.addEventListener('click', () => this.closeContextMenu());
        // 1. (메인) 씬 설정
        document.getElementById('ctx-set-main').addEventListener('click', async () => {
            if (!this.selectedSceneForCtx)
                return;
            try {
                await fetch(`/api/scenes/${this.selectedSceneForCtx.id}/main`, { method: 'POST' });
                this.fetchScenes();
            }
            catch (err) {
                console.error('Set main scene error:', err);
            }
        });
        // 2. 씬 이름 변경
        document.getElementById('ctx-rename').addEventListener('click', async () => {
            if (!this.selectedSceneForCtx)
                return;
            const newName = prompt('변경할 씬의 이름을 입력해 주세요:', this.selectedSceneForCtx.name);
            if (!newName || !newName.trim())
                return;
            try {
                await fetch(`/api/scenes/${this.selectedSceneForCtx.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName.trim() }),
                });
                this.fetchScenes();
            }
            catch (err) {
                console.error('Rename scene error:', err);
            }
        });
        // 3. 씬 삭제
        document.getElementById('ctx-delete').addEventListener('click', async () => {
            if (!this.selectedSceneForCtx)
                return;
            if (!confirm(`'${this.selectedSceneForCtx.name}' 씬을 삭제하시겠습니까?`))
                return;
            try {
                await fetch(`/api/scenes/${this.selectedSceneForCtx.id}`, { method: 'DELETE' });
                this.fetchScenes();
            }
            catch (err) {
                console.error('Delete scene error:', err);
            }
        });
    }
    // 씬 생성 모달
    initCreateModalEvents() {
        const modal = document.getElementById('create-scene-modal');
        const nameInput = document.getElementById('new-scene-name');
        document.getElementById('btn-open-create-modal').addEventListener('click', () => {
            nameInput.value = '';
            modal.classList.add('active');
        });
        document.getElementById('btn-cancel-create').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        document.getElementById('btn-submit-create').addEventListener('click', async () => {
            const name = nameInput.value.trim();
            if (!name) {
                alert('씬 이름을 반드시 작성해 주세요!');
                return;
            }
            try {
                // 서버 전송 및 DB 저장
                const res = await fetch('/api/scenes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name }),
                });
                const json = await res.json();
                if (json.success) {
                    modal.classList.remove('active');
                    this.fetchScenes();
                }
            }
            catch (err) {
                console.error('Create scene error:', err);
            }
        });
    }
}
window.addEventListener('DOMContentLoaded', () => {
    new AdminMainApp();
});
export {};
