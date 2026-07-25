import { v4 as uuidv4 } from 'uuid';
import { Flower } from '../types/flower.js';
import { Scene } from '../types/scene.js';

export class MemoryStore {
    private scenes: Scene[] = [];

    constructor() {
        // 기본 메인 씬 1개 자동 생성
        const defaultScene: Scene = {
            id: uuidv4(),
            name: '기본 정원 씬',
            createdAt: new Date().toISOString(),
            backgroundImage: '', // 빈 문자열일 경우 클라이언트에서 어두운 초록 그래디언트로 예외 처리
            isMain: true,
            flowers: [],
        };
        this.scenes.push(defaultScene);
    }

    // 모든 씬 목록 가져오기 (생성 오름차순)
    public getScenes(): Scene[] {
        return [...this.scenes].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }

    // 현재 메인 씬 가져오기
    public getMainScene(): Scene {
        let mainScene = this.scenes.find((s) => s.isMain);
        if (!mainScene) {
            if (this.scenes.length > 0) {
                this.scenes[0].isMain = true;
                mainScene = this.scenes[0];
            } else {
                mainScene = {
                    id: uuidv4(),
                    name: '기본 정원 씬',
                    createdAt: new Date().toISOString(),
                    backgroundImage: '',
                    isMain: true,
                    flowers: [],
                };
                this.scenes.push(mainScene);
            }
        }
        return mainScene;
    }

    // 특정 ID 씬 가져오기
    public getSceneById(id: string): Scene | undefined {
        return this.scenes.find((s) => s.id === id);
    }

    // 새 씬 생성
    public createScene(name: string, backgroundImage = ''): Scene {
        const newScene: Scene = {
            id: uuidv4(),
            name: name.trim(),
            createdAt: new Date().toISOString(),
            backgroundImage,
            isMain: this.scenes.length === 0, // 첫 씬이면 메인으로
            flowers: [],
        };
        this.scenes.push(newScene);
        return newScene;
    }

    // 씬 업데이트 (이름, 배경 등)
    public updateScene(id: string, updates: Partial<Scene>): Scene | null {
        const scene = this.scenes.find((s) => s.id === id);
        if (!scene) return null;

        if (updates.name !== undefined) scene.name = updates.name.trim();
        if (updates.backgroundImage !== undefined) scene.backgroundImage = updates.backgroundImage;
        return scene;
    }

    // 메인 씬 지정
    public setMainScene(id: string): Scene | null {
        const targetScene = this.scenes.find((s) => s.id === id);
        if (!targetScene) return null;

        this.scenes.forEach((s) => (s.isMain = s.id === id));
        return targetScene;
    }

    // 씬 삭제
    public deleteScene(id: string): boolean {
        const index = this.scenes.findIndex((s) => s.id === id);
        if (index === -1) return false;

        const wasMain = this.scenes[index].isMain;
        this.scenes.splice(index, 1);

        // 삭제된 씬이 메인이었고 다른 씬이 남아있다면 첫 번째 씬을 메인으로 승격
        if (wasMain && this.scenes.length > 0) {
            this.scenes[0].isMain = true;
        }
        return true;
    }

    // 특정 씬에 꽃 추가
    public addFlower(sceneId: string, flowerData: Omit<Flower, 'id' | 'createdAt'>): { scene: Scene; flower: Flower } | null {
        const scene = this.scenes.find((s) => s.id === sceneId);
        if (!scene) return null;

        const newFlower: Flower = {
            id: uuidv4(),
            sceneId: scene.id,
            image: flowerData.image,
            posX: flowerData.posX,
            posY: flowerData.posY,
            owner: flowerData.owner,
            nameAnchor: flowerData.nameAnchor || 'top',
            createdAt: new Date().toISOString(),
        };

        scene.flowers.push(newFlower);
        return { scene, flower: newFlower };
    }

    // 특정 씬의 특정 꽃 정보 수정
    public updateFlower(sceneId: string, flowerId: string, updates: Partial<Flower>): Flower | null {
        const scene = this.scenes.find((s) => s.id === sceneId);
        if (!scene) return null;

        const flower = scene.flowers.find((f) => f.id === flowerId);
        if (!flower) return null;

        if (updates.owner !== undefined) flower.owner = updates.owner;
        if (updates.posX !== undefined) flower.posX = updates.posX;
        if (updates.posY !== undefined) flower.posY = updates.posY;
        if (updates.nameAnchor !== undefined) flower.nameAnchor = updates.nameAnchor;

        return flower;
    }

    // 특정 씬의 특정 꽃 삭제
    public deleteFlower(sceneId: string, flowerId: string): boolean {
        const scene = this.scenes.find((s) => s.id === sceneId);
        if (!scene) return false;

        const initialLength = scene.flowers.length;
        scene.flowers = scene.flowers.filter((f) => f.id !== flowerId);
        return scene.flowers.length < initialLength;
    }

    // 관리자 Publish 일괄 씬 상태 저장
    public publishScene(sceneId: string, flowers: Flower[], backgroundImage?: string): Scene | null {
        const scene = this.scenes.find((s) => s.id === sceneId);
        if (!scene) return null;

        scene.flowers = flowers;
        if (backgroundImage !== undefined) {
            scene.backgroundImage = backgroundImage;
        }
        return scene;
    }
}
