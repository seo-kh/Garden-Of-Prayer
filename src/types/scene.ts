import { Flower } from './flower.js';

export interface Scene {
    id: string;              // UUID
    name: string;            // 씬 이름
    createdAt: string;       // 생성 날짜 (ISO 문자열)
    backgroundImage: string; // 이미지/GIF/동영상 파일 경로 또는 Data URL
    isMain: boolean;         // 메인 씬 여부 (노란색 별표 ★)
    flowers: Flower[];       // 해당 씬에 배치된 꽃 목록
}
