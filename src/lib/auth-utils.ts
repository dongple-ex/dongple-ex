import CryptoJS from "crypto-js";

/**
 * 감상적인 수식어가 붙은 익명 닉네임 생성
 * 예: "음악감상중인 8df2", "여행을꿈꾸는 f29s"
 */
export function generateSentimentalNickname(publicId: string): string {
    const prefixes = [
        "음악감상중인", "운동을좋아하는", "길을걷고있는", "커피를마시는", 
        "여행을꿈꾸는", "동네를사랑하는", "별을구경하는", "추억을기록하는",
        "소식을전하는", "모험을즐기는", "따뜻한마음의", "꿈을꾸고있는"
    ];
    
    // publicId를 해시값으로 인덱스 결정 (일관되게 유지)
    let hash = 0;
    for (let i = 0; i < publicId.length; i++) {
        hash = ((hash << 5) - hash) + publicId.charCodeAt(i);
        hash |= 0;
    }
    
    const index = Math.abs(hash) % prefixes.length;
    // publicId의 마지막 4자리 사용
    const shortId = publicId.split('-').pop() || publicId.substring(0, 4);
    
    return `${prefixes[index]} ${shortId}`;
}

/**
 * 전역 익명 식별자(public_id) 생성 로직
 * HMAC(secret, user_id + salt + time_bucket)
 */
export function generatePublicId(userId: string, secretKey: string = "dongple-hub-secret-2026"): string {
    const timestampBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const salt = "community-trust-salt";
    
    const message = `${userId}-${salt}-${timestampBucket}`;
    const hash = CryptoJS.HmacSHA256(message, secretKey);
    
    const fullHash = hash.toString(CryptoJS.enc.Hex);
    // 8자리만 사용하여 가독성 확보 (예: 8df2-a9b1)
    const segments = fullHash.substring(0, 8).match(/.{1,4}/g);
    return segments?.join('-') || fullHash.substring(0, 8);
}

/**
 * 로컬 스토리지 기반 영속적 사용자 ID 가져오기 (없으면 생성)
 */
export function getPersistentUserId(): string {
    if (typeof window === 'undefined') return "";
    
    let id = localStorage.getItem('dongple_user_id');
    if (!id) {
        id = `u-${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem('dongple_user_id', id);
    }
    return id;
}
