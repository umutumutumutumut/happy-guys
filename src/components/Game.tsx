import React, { useEffect, useRef, useState } from 'react';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  speed: number;
  jumpPower: number;
  grounded: boolean;
  color: string;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isGround?: boolean;
}

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isProceduralUsed, setIsProceduralUsed] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const platformsRef = useRef<Platform[]>((() => {
    const saved = localStorage.getItem('savedMap');
    const initialY = window.innerHeight - 40;
    if (saved) {
      const parsedMap: Platform[] = JSON.parse(saved);
      return parsedMap.map(p => p.isGround ? { ...p, y: initialY, width: Math.max(p.width, 10000) } : p);
    }
    return [
      { x: 0, y: initialY, width: 10000, height: 40, color: '#4CAF50', isGround: true },
      { x: 200, y: initialY - 150, width: 200, height: 20, color: '#FF5722' },
      { x: 500, y: initialY - 300, width: 150, height: 20, color: '#FF5722' },
      { x: 800, y: initialY - 450, width: 150, height: 20, color: '#FF5722' },
    ];
  })());

  const [platformsUI, setPlatformsUI] = useState<Platform[]>(platformsRef.current);

  const playerRef = useRef<Player>({
    x: 100, y: window.innerHeight - 150, width: 32, height: 48,
    vx: 0, vy: 0, speed: 6, jumpPower: 14,
    grounded: false, color: '#3498db'
  });

  const keys = useRef<{ [key: string]: boolean }>({});

  const checkAdmin = async () => {
    if (isProceduralUsed) {
      alert("Harita oluşturulduğu için Admin paneline artık erişilemez.");
      return;
    }
    const passInput = prompt("Admin Şifresi:");
    if (!passInput) return;
    const pass = passInput.trim();
    const msgBuffer = new TextEncoder().encode(pass);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const CORRECT_HASH = "e2e55b38755eb4f231082c97fa9914566f84cbc310d417057ecc42a0581716c1";
    if (hashed === CORRECT_HASH) {
      setIsAdmin(true);
      setIsEditorOpen(true);
      setPlatformsUI([...platformsRef.current]);
    } else {
      alert("Hatalı Şifre!");
    }
  };

  const generateProceduralMap = () => {
    setIsProceduralUsed(true);
    setIsEditorOpen(false);
    const currentPlatforms = platformsRef.current;
    const lastP = currentPlatforms[currentPlatforms.length - 1];
    let currentX = lastP.x + lastP.width;
    let currentY = lastP.y;
    const added = [];
    const canvasH = canvasRef.current?.height || 600;

    for (let i = 0; i < 15; i++) {
      const jumpX = 160 + Math.random() * 220;
      const jumpY = (Math.random() - 0.5) * 180;
      currentX += jumpX;
      currentY += jumpY;
      if (currentY < 150) currentY = 250;
      if (currentY > canvasH - 120) currentY = canvasH - 250;
      added.push({ x: Math.round(currentX), y: Math.round(currentY), width: Math.round(80 + Math.random() * 120), height: 20, color: '#FF5722' });
    }
    platformsRef.current.forEach(p => { if (p.isGround) p.width = Math.max(p.width, currentX + 5000); });
    platformsRef.current = [...currentPlatforms, ...added];
    setPlatformsUI([...platformsRef.current]);
  };

  const copyMapJSON = () => {
    const json = JSON.stringify(platformsRef.current, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert("Harita verisi JSON olarak kopyalandı! Bu veriyi bana (sohbet ekranına) yapıştırıp 'kaydet' derseniz klasöre ekleyebilirim.");
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      platformsRef.current.forEach(p => { if (p.isGround) p.y = canvas.height - 40; });
    };

    const handleKeyDown = (e: KeyboardEvent) => { 
      keys.current[e.code] = true;
      if (e.shiftKey && e.code === 'KeyA') {
        if (!isAdmin) checkAdmin();
        else setIsEditorOpen(prev => !prev);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    handleResize();

    let animationFrameId: number;

    const update = () => {
      const player = playerRef.current;
      if (draggedIndex === null) {
        player.vy += 0.6;
        if (keys.current['ArrowLeft'] || keys.current['KeyA']) player.vx = -player.speed;
        else if (keys.current['ArrowRight'] || keys.current['KeyD']) player.vx = player.speed;
        else player.vx *= 0.82;
        if ((keys.current['ArrowUp'] || keys.current['KeyW'] || keys.current['Space']) && player.grounded) {
          player.vy = -player.jumpPower;
          player.grounded = false;
        }
        player.x += player.vx;
        player.y += player.vy;
        player.grounded = false;
        for (const p of platformsRef.current) {
          if (p.isGround) p.width = Math.max(p.width, player.x + canvas.width * 2);
          if (player.x < p.x + p.width && player.x + player.width > p.x &&
              player.y < p.y + p.height && player.y + player.height > p.y) {
            const ox = Math.min(player.x + player.width, p.x + p.width) - Math.max(player.x, p.x);
            const oy = Math.min(player.y + player.height, p.y + p.height) - Math.max(player.y, p.y);
            if (ox > oy) {
              if (player.vy > 0 && player.y < p.y) { player.y = p.y - player.height; player.vy = 0; player.grounded = true; }
              else if (player.vy < 0 && player.y > p.y) { player.y = p.y + p.height; player.vy = 0; }
            } else {
              if (player.vx > 0) player.x = p.x - player.width;
              else if (player.vx < 0) player.x = p.x + p.width;
            }
          }
        }
        if (player.x < 0) player.x = 0;
        if (player.y > canvas.height) { player.x = 100; player.y = 100; player.vy = 0; }
      }
    };

    const draw = () => {
      const player = playerRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cameraX = Math.max(0, player.x - canvas.width / 4);
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#1a2a6c'); grad.addColorStop(0.5, '#b21f1f'); grad.addColorStop(1, '#fdbb2d');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(-cameraX, 0);
      platformsRef.current.forEach((p, i) => {
        ctx.fillStyle = p.color;
        if (isAdmin && isEditorOpen && draggedIndex === i) { ctx.shadowBlur = 15; ctx.shadowColor = 'white'; }
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = isAdmin && isEditorOpen ? 'white' : 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(p.x, p.y, p.width, p.height);
        ctx.shadowBlur = 0;
      });
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(player.x + player.width/2, player.y + player.height + 2, player.width/2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.width, player.height);
      ctx.fillStyle = 'white';
      const ex = player.vx > 0.1 ? player.x + 20 : player.vx < -0.1 ? player.x + 4 : player.x + 12;
      ctx.fillRect(ex, player.y + 10, 8, 8);
      ctx.fillStyle = 'black';
      ctx.fillRect(ex + (player.vx >= 0 ? 4 : 0), player.y + 12, 4, 4);
      ctx.restore();
      if (isAdmin && isEditorOpen) {
        ctx.fillStyle = 'white'; ctx.font = 'bold 14px Arial';
        ctx.fillText('MOD: EDİTÖR AKTİF', 20, 60);
      }
    };

    const loop = () => { update(); draw(); animationFrameId = requestAnimationFrame(loop); };
    animationFrameId = requestAnimationFrame(loop);

    const handlePointerDown = (e: PointerEvent) => {
      if (!isAdmin || !isEditorOpen) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + (playerRef.current.x - canvas.width / 4);
      const mouseY = e.clientY - rect.top;
      for (let i = platformsRef.current.length - 1; i >= 0; i--) {
        const p = platformsRef.current[i];
        if (!p.isGround && mouseX >= p.x && mouseX <= p.x + p.width && mouseY >= p.y && mouseY <= p.y + p.height) {
          setDraggedIndex(i);
          dragOffset.current = { x: mouseX - p.x, y: mouseY - p.y };
          canvas.setPointerCapture(e.pointerId);
          return;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (draggedIndex === null) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + (playerRef.current.x - canvas.width / 4);
      const mouseY = e.clientY - rect.top;
      platformsRef.current[draggedIndex].x = Math.round(mouseX - dragOffset.current.x);
      platformsRef.current[draggedIndex].y = Math.round(mouseY - dragOffset.current.y);
      setPlatformsUI([...platformsRef.current]);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (draggedIndex !== null) { setDraggedIndex(null); canvas.releasePointerCapture(e.pointerId); }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAdmin, isEditorOpen, draggedIndex, isProceduralUsed]);

  const updatePlatformUI = (i: number, f: keyof Platform, v: any) => {
    platformsRef.current[i] = { ...platformsRef.current[i], [f]: v };
    setPlatformsUI([...platformsRef.current]);
  };

  const addPlatform = () => {
    platformsRef.current.push({ x: playerRef.current.x + 200, y: playerRef.current.y, width: 100, height: 20, color: '#FF5722' });
    setPlatformsUI([...platformsRef.current]);
  };

  const removePlatform = (i: number) => {
    platformsRef.current = platformsRef.current.filter((_, idx) => idx !== i);
    setPlatformsUI([...platformsRef.current]);
  };

  const saveMap = () => {
    localStorage.setItem('savedMap', JSON.stringify(platformsRef.current));
    alert("Harita tarayıcıya kaydedildi!");
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      
      <button onClick={generateProceduralMap} style={{ position: 'absolute', top: '10px', right: '10px', background: '#4CAF50', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', zIndex: 1000 }}>
        ✨ Yeni Harita Oluştur
      </button>

      {isAdmin && isEditorOpen && (
        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '100%', background: 'rgba(0,0,0,0.9)', color: 'white', padding: '20px', overflowY: 'auto', borderLeft: '2px solid #FFD700', zIndex: 2000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3>Editör</h3>
            <button onClick={() => setIsEditorOpen(false)} style={{ color: 'red', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
          </div>
          <button onClick={addPlatform} style={{ width: '100%', padding: '10px', background: '#FFD700', border: 'none', fontWeight: 'bold', marginBottom: '10px' }}>+ Yeni Platform</button>
          {platformsUI.map((p, i) => !p.isGround && (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>P#{i}</b><button onClick={() => removePlatform(i)} style={{ color: '#ff4444', background: 'none', border: 'none' }}>Sil</button></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                <label>X: <input type="number" value={p.x} onChange={e => updatePlatformUI(i, 'x', parseInt(e.target.value))} style={{ width: '100%', background: '#222', color: 'white' }} /></label>
                <label>Y: <input type="number" value={p.y} onChange={e => updatePlatformUI(i, 'y', parseInt(e.target.value))} style={{ width: '100%', background: '#222', color: 'white' }} /></label>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <button onClick={saveMap} style={{ width: '100%', padding: '12px', background: '#2196F3', color: 'white', border: 'none', fontWeight: 'bold' }}>💾 Tarayıcıya Kaydet</button>
            <button onClick={copyMapJSON} style={{ width: '100%', padding: '12px', background: '#9C27B0', color: 'white', border: 'none', fontWeight: 'bold' }}>📄 JSON Verisini Kopyala</button>
          </div>
        </div>
      )}

      {!isEditorOpen && (
        <>
          <div style={{ position: 'absolute', bottom: '30px', left: '30px', display: 'flex', gap: '20px' }}>
            <div onPointerDown={() => keys.current['ArrowLeft'] = true} onPointerUp={() => keys.current['ArrowLeft'] = false} onPointerLeave={() => keys.current['ArrowLeft'] = false} style={{ width: '70px', height: '70px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '35px', userSelect: 'none' }}>←</div>
            <div onPointerDown={() => keys.current['ArrowRight'] = true} onPointerUp={() => keys.current['ArrowRight'] = false} onPointerLeave={() => keys.current['ArrowRight'] = false} style={{ width: '70px', height: '70px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '35px', userSelect: 'none' }}>→</div>
          </div>
          <div onPointerDown={() => keys.current['Space'] = true} onPointerUp={() => keys.current['Space'] = false} onPointerLeave={() => keys.current['Space'] = false} style={{ position: 'absolute', bottom: '30px', right: '30px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', userSelect: 'none' }}>JUMP</div>
        </>
      )}
    </div>
  );
};

export default Game;
