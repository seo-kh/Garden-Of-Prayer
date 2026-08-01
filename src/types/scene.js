import { v4 as uuidv4 } from 'uuid';

/**
 * @typedef {import('./flower.js').Flower} Flower
 */

/**
 * @typedef {Object} Scene
 * @property {string} id - UUID
 * @property {string} name - 씬 이름
 * @property {string} createdAt - 생성 날짜 (ISO 문자열)
 * @property {string} backgroundImage - 이미지/GIF/동영상 파일 경로 또는 Data URL
 * @property {boolean} isMain - 메인 씬 여부 (노란색 별표 ★)
 * @property {Flower[]} flowers - 해당 씬에 배치된 꽃 목록
 */

/**
 * Scene 객체를 생성하는 헬퍼 함수
 */
export function createScene({ id, name, backgroundImage = '', isMain = false, flowers = [] }) {
  return {
    id: id || uuidv4(),
    name: name || '새 정원',
    createdAt: new Date().toISOString(),
    backgroundImage: backgroundImage || '',
    isMain: Boolean(isMain),
    flowers: Array.isArray(flowers) ? flowers : [],
  };
}