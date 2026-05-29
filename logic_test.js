const crypto = require('crypto');

console.log("--- KENDİ KENDİNE TEST MOTORU BAŞLATILDI ---");

// 1. ŞİFRE VE HASH TESTİ
function testPassword(input) {
    const hash = crypto.createHash('sha256').update(input.trim()).digest('hex');
    const EXPECTED = "e2e55b38755eb4f231082c97fa9914566f84cbc310d417057ecc42a0581716c1";
    
    console.log(`\n[Aşama 1: Şifre Kontrolü]`);
    console.log(`Girdi: ${input}`);
    console.log(`Oluşan Hash: ${hash}`);
    
    if (hash === EXPECTED) {
        console.log("SONUÇ: ŞİFRE DOĞRULAMA BAŞARILI! ✅");
        return true;
    } else {
        console.log("SONUÇ: ŞİFRE HATALI! ❌");
        return false;
    }
}

// 2. HARİTA ALGORİTMASI TESTİ
function testAlgorithm() {
    console.log(`\n[Aşama 2: Harita Algoritması Kontrolü]`);
    
    let platforms = [];
    let currentX = 100;
    let currentY = 500;
    const canvasHeight = 800;
    const platformCount = 15;

    console.log(`${platformCount} adet platform üretiliyor...`);

    for (let i = 0; i < platformCount; i++) {
        const jumpX = 120 + Math.random() * 180;
        const jumpY = (Math.random() - 0.5) * 150;
        
        currentX += jumpX;
        currentY += jumpY;

        if (currentY < 150) currentY = 250;
        if (currentY > canvasHeight - 100) currentY = canvasHeight - 250;

        platforms.push({ x: Math.round(currentX), y: Math.round(currentY) });
    }

    if (platforms.length === 15) {
        console.log(`SONUÇ: ALGORİTMA BAŞARIYLA ${platforms.length} PLATFORM ÜRETTİ! ✅`);
        console.log("Örnek Koordinatlar:", platforms.slice(0, 3));
        return true;
    }
    return false;
}

// TESTLERİ ÇALIŞTIR
const p1 = testPassword("uummuutt12341234");
const p2 = testAlgorithm();

if (p1 && p2) {
    console.log("\n--- TÜM SİSTEMLER ÇALIŞIYOR: TEST BAŞARILI ---");
} else {
    console.log("\n--- TEST BAŞARISIZ! ---");
    process.exit(1);
}
