import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MemoryStore } from './store/memoryStore.js';
import { SupabaseStore } from './store/supabaseStore.js';
import { Flower } from './types/flower.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    maxHttpBufferSize: 1e7, // 10MB base64 이미지 전송 허용
});

const PORT = process.env.PORT || 3000;
const isRelease = process.env.NODE_ENV === 'release';

// 데이터 스토어 인스턴스 (Debug: MemoryStore, Release: SupabaseStore)
const store = isRelease ? new SupabaseStore() : new MemoryStore();

console.log(`🌸 Garden of Prayer Server starting in [${isRelease ? 'RELEASE' : 'DEBUG (In-Memory)'}] mode...`);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// 정적 자원 서빙 (public 디렉터리)
const publicPath = path.join(__dirname, '../public');
// app.use(express.static(publicPath));
// dist 폴더를 클라이언트에서 접근할 수 있도록 지정
app.use(express.static(path.join(process.cwd(), 'dist')));

// dist에 없는 css 원본 폴더를 직접 연결
app.use('/public/css', express.static(path.join(process.cwd(), 'public/css')));
// ----------------------------------------------------
// 페이지 라우팅
// ----------------------------------------------------
app.get('/ipad', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'ipad/index.html'));
});

app.get('/projector', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'projector/index.html'));
});

app.get('/admin', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'admin/index.html'));
});

app.get('/admin/setting', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'admin/setting.html'));
});

// ----------------------------------------------------
// REST API 엔드포인트
// ----------------------------------------------------

// 1. 모든 씬 목록 조회
app.get('/api/scenes', (req: Request, res: Response) => {
    const scenes = store.getScenes();
    res.json({ success: true, data: scenes });
});

// 2. 메인 씬 조회
app.get('/api/scenes/main', (req: Request, res: Response) => {
    const mainScene = store.getMainScene();
    res.json({ success: true, data: mainScene });
});

// 3. 특정 씬 조회
app.get('/api/scenes/:id', (req: Request, res: Response) => {
    const scene = store.getSceneById(req.params.id);
    if (!scene) {
        return res.status(404).json({ success: false, message: 'Scene not found' });
    }
    res.json({ success: true, data: scene });
});

// 4. 새 씬 생성
app.post('/api/scenes', (req: Request, res: Response) => {
    const { name, backgroundImage } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Scene name is required' });
    }

    const newScene = store.createScene(name, backgroundImage || '');
    io.emit('scene_created', newScene);
    res.json({ success: true, data: newScene });
});

// 5. 씬 정보 수정
app.put('/api/scenes/:id', (req: Request, res: Response) => {
    const { name, backgroundImage } = req.body;
    const updatedScene = store.updateScene(req.params.id, { name, backgroundImage });
    if (!updatedScene) {
        return res.status(404).json({ success: false, message: 'Scene not found' });
    }
    io.emit('scene_updated', updatedScene);
    res.json({ success: true, data: updatedScene });
});

// 6. 메인 씬 지정
app.post('/api/scenes/:id/main', (req: Request, res: Response) => {
    const mainScene = store.setMainScene(req.params.id);
    if (!mainScene) {
        return res.status(404).json({ success: false, message: 'Scene not found' });
    }
    io.emit('main_scene_changed', mainScene);
    res.json({ success: true, data: mainScene });
});

// 7. 씬 삭제
app.delete('/api/scenes/:id', (req: Request, res: Response) => {
    const success = store.deleteScene(req.params.id);
    if (!success) {
        return res.status(404).json({ success: false, message: 'Scene not found' });
    }
    const mainScene = store.getMainScene();
    io.emit('scene_deleted', { deletedId: req.params.id, currentMainScene: mainScene });
    res.json({ success: true, data: { deletedId: req.params.id, mainScene } });
});

// 8. 꽃 생성 (전송)
app.post('/api/flowers', (req: Request, res: Response) => {
    const { image, posX, posY, owner, nameAnchor, sceneId } = req.body;

    let targetSceneId = sceneId;
    if (!targetSceneId) {
        const mainScene = store.getMainScene();
        targetSceneId = mainScene.id;
    }

    const result = store.addFlower(targetSceneId, {
        image,
        posX: Number(posX),
        posY: Number(posY),
        owner,
        nameAnchor: nameAnchor || 'top',
    });

    if (!result) {
        return res.status(404).json({ success: false, message: 'Target scene not found' });
    }

    // 실시간 웹소켓 브로드캐스팅
    io.emit('flower_added', { sceneId: targetSceneId, flower: result.flower, scene: result.scene });
    res.json({ success: true, data: result.flower });
});

// 9. 특정 씬의 특정 꽃 정보 수정
app.put('/api/scenes/:sceneId/flowers/:flowerId', (req: Request, res: Response) => {
    const { owner, posX, posY, nameAnchor } = req.body;
    const updatedFlower = store.updateFlower(req.params.sceneId, req.params.flowerId, {
        owner,
        posX: posX !== undefined ? Number(posX) : undefined,
        posY: posY !== undefined ? Number(posY) : undefined,
        nameAnchor,
    });

    if (!updatedFlower) {
        return res.status(404).json({ success: false, message: 'Flower or Scene not found' });
    }

    const scene = store.getSceneById(req.params.sceneId);
    io.emit('flower_updated', { sceneId: req.params.sceneId, flower: updatedFlower, scene });
    res.json({ success: true, data: updatedFlower });
});

// 10. 특정 씬의 특정 꽃 삭제
app.delete('/api/scenes/:sceneId/flowers/:flowerId', (req: Request, res: Response) => {
    const success = store.deleteFlower(req.params.sceneId, req.params.flowerId);
    if (!success) {
        return res.status(404).json({ success: false, message: 'Flower or Scene not found' });
    }

    const scene = store.getSceneById(req.params.sceneId);
    io.emit('flower_deleted', { sceneId: req.params.sceneId, flowerId: req.params.flowerId, scene });
    res.json({ success: true, data: { deletedId: req.params.flowerId } });
});

// 11. 관리자 씬 게시 (Publish)
app.post('/api/scenes/:id/publish', (req: Request, res: Response) => {
    const { flowers, backgroundImage } = req.body;
    const publishedScene = store.publishScene(req.params.id, flowers || [], backgroundImage);

    if (!publishedScene) {
        return res.status(404).json({ success: false, message: 'Scene not found' });
    }

    // 메인 씬으로 지정된 씬이 게시되면 실시간 프로젝터 및 아이패드 전송
    io.emit('scene_published', publishedScene);
    res.json({ success: true, data: publishedScene });
});

// ----------------------------------------------------
// Socket.io Real-time Event Handlers
// ----------------------------------------------------
io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // 클라이언트 접속 시 현재 메인 씬 및 데이터 즉시 전달
    const mainScene = store.getMainScene();
    socket.emit('init_data', { mainScene, scenes: store.getScenes() });

    // 아이패드 꽃 제출 소켓 이벤트
    socket.on('submit_flower', (flowerData: { image: string; posX: number; posY: number; owner: string; nameAnchor: any; sceneId?: string }) => {
        let targetSceneId = flowerData.sceneId;
        if (!targetSceneId) {
            targetSceneId = store.getMainScene().id;
        }

        const result = store.addFlower(targetSceneId, {
            image: flowerData.image,
            posX: Number(flowerData.posX),
            posY: Number(flowerData.posY),
            owner: flowerData.owner,
            nameAnchor: flowerData.nameAnchor || 'top',
        });

        if (result) {
            io.emit('flower_added', { sceneId: targetSceneId, flower: result.flower, scene: result.scene });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   - iPad:       http://localhost:${PORT}/ipad`);
    console.log(`   - Projector:  http://localhost:${PORT}/projector`);
    console.log(`   - Admin:      http://localhost:${PORT}/admin`);
});
