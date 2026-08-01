import { v4 as uuidv4 } from 'uuid';

/**
 * @typedef {'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left' | 'top-left' | 'center'} NameAnchor
 */

/**
 * @typedef {Object} Flower
 * @property {string} id - UUID
 * @property {string} [sceneId] - 해당 꽃이 속한 Scene ID
 * @property {string} image - 투명 배경 PNG Data URL (data:image/png;base64,...)
 * @property {number} posX - 정원 화면 기준 상대 X 위치 (0.0 ~ 1.0)
 * @property {number} posY - 정원 화면 기준 상대 Y 위치 (0.0 ~ 1.0)
 * @property {string} owner - 입력받은 사용자 이름
 * @property {NameAnchor} nameAnchor - 이름표 배치 앵커 (9가지)
 * @property {string} createdAt - 생성 시간 (ISO 문자열)
 */

/**
 * Flower 객체를 생성하는 헬퍼 함수
 */
export function createFlower({ sceneId, image, posX, posY, owner, nameAnchor }) {
  return {
    id: uuidv4(),
    sceneId: sceneId || '',
    image: image || '',
    posX: Number(posX) || 0,
    posY: Number(posY) || 0,
    owner: owner || '',
    nameAnchor: nameAnchor || 'top',
    createdAt: new Date().toISOString(),
  };
}