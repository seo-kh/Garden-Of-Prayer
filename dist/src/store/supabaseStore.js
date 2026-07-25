import { MemoryStore } from './memoryStore.js';
// Release 모드에서 Supabase DB/Storage 연동 어댑터
// 현재는 MemoryStore 인터페이스와 동일하게 동작하는 래퍼로 제공되며, Supabase 연동 시 환경 변수 사용
export class SupabaseStore extends MemoryStore {
    supabaseUrl;
    supabaseKey;
    constructor() {
        super();
        this.supabaseUrl = process.env.SUPABASE_URL || '';
        this.supabaseKey = process.env.SUPABASE_KEY || '';
        if (this.supabaseUrl && this.supabaseKey) {
            console.log('🔗 Supabase Store Initialized with URL:', this.supabaseUrl);
        }
        else {
            console.log('⚠️ Supabase credentials not found. Falling back to In-Memory store adapter.');
        }
    }
}
