export type NameAnchor =
    | 'top'
    | 'top-right'
    | 'right'
    | 'bottom-right'
    | 'bottom'
    | 'bottom-left'
    | 'left'
    | 'top-left'
    | 'center';

export interface Flower {
    id: string;          // UUID
    sceneId?: string;    // 해당 꽃이 속한 Scene ID
    image: string;       // 투명 배경 PNG Data URL (data:image/png;base64,...)
    posX: number;        // 정원 화면 기준 상대 X 위치 (0.0 ~ 1.0)
    posY: number;        // 정원 화면 기준 상대 Y 위치 (0.0 ~ 1.0)
    owner: string;       // 입력받은 사용자 이름
    nameAnchor: NameAnchor; // 이름표 배치 앵커 (9가지)
    createdAt: string;   // 생성 시간 (ISO 문자열)
}
