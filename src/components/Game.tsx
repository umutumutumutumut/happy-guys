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
  const [gameStarted, setGameStarted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isProceduralUsed, setIsProceduralUsed] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const squashRef = useRef(1);

  // Default Map Factory
  const getDefaultMap = (h: number): Platform[] => [
    { x: 0, y: h - 40, width: 20000, height: 40, color: '#4CAF50', isGround: true },
    { x: 200, y: h - 200, width: 200, height: 20, color: '#FF5722' },
    { x: 500, y: h - 350, width: 150, height: 20, color: '#FF5722' },
    { x: 800, y: h - 500, width: 150, height: 20, color: '#FF5722' },
  ];

  const platformsRef = useRef<Platform[]>([]);

  // Initialize platforms once
  useEffect(() => {
    const saved = localStorage.getItem('savedMap');
    const initialH = window.innerHeight;
    if (saved) {
      try {
        const parsedMap: Platform[] = JSON.parse(saved);
        platformsRef.current = parsedMap.map(p => p.isGround ? { ...p, y: initialH - 40, width: Math.max(p.width, 20000) } : p);
      } catch (e) {
        platformsRef.current = getDefaultMap(initialH);
      }
    } else {
      platformsRef.current = getDefaultMap(initialH);
    }
    setPlatformsUI([...platformsRef.current]);
  }, []);

  const [platformsUI, setPlatformsUI] = useState<Platform[]>([]);

  const playerRef = useRef<Player>({
    x: 200, y: window.innerHeight - 300, width: 32, height: 48,
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
    const lastP = currentPlatforms[currentPlatforms.length - 1] || { x: 0, y: window.innerHeight, width: 0 };
    let currentX = lastP.x + lastP.width;
    let currentY = lastP.y;
    const added = [];
    const canvasH = canvasRef.current?.height || window.innerHeight;

    for (let i = 0; i < 15; i++) {
      const jumpX = 140 + Math.random() * 110;
      const jumpY = (Math.random() - 0.5) * 160;
      currentX += jumpX;
      currentY += jumpY;
      if (currentY < 180) currentY = 280;
      if (currentY > canvasH - 120) currentY = canvasH - 250;
      added.push({ x: Math.round(currentX), y: Math.round(currentY), width: Math.round(100 + Math.random() * 80), height: 20, color: '#FF5722' });
    }
    platformsRef.current.forEach(p => { if (p.isGround) p.width = Math.max(p.width, currentX + 5000); });
    platformsRef.current = [...currentPlatforms, ...added];
    setPlatformsUI([...platformsRef.current]);
  };

  const copyMapJSON = () => {
    const json = JSON.stringify(platformsRef.current, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert("Harita verisi JSON olarak kopyalandı!");
    });
  };

  const resetMap = () => {
    if (confirm("Harita sıfırlansın mı?")) {
      platformsRef.current = getDefaultMap(window.innerHeight);
      setPlatformsUI([...platformsRef.current]);
      localStorage.removeItem('savedMap');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const oldH = canvas.height;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (oldH > 0) {
        const diff = canvas.height - oldH;
        platformsRef.current.forEach(p => p.y += diff);
        playerRef.current.y += diff;
        setPlatformsUI([...platformsRef.current]);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => { 
      keys.current[e.code] = true;
      if (e.shiftKey && e.code === 'KeyA') {
        if (!isAdmin) checkAdmin();
        else setIsEditorOpen(prev => !prev);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    const handleContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('contextmenu', handleContextMenu);
    handleResize();

    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const fixedDt = 1 / 100; // 100Hz Physics

    const updatePhysics = () => {
      if (!gameStarted) return;
      const player = playerRef.current;
      if (draggedIndex === null) {
        const wasInAir = !player.grounded;
        const gravity = 0.36; 
        const accel = 0.48;   
        const friction = 0.964; 
        const jumpPower = 14;

        player.vy += gravity;
        if (keys.current['ArrowLeft'] || keys.current['KeyA']) player.vx -= accel;
        else if (keys.current['ArrowRight'] || keys.current['KeyD']) player.vx += accel;
        else player.vx *= friction;

        if (player.vx > player.speed) player.vx = player.speed;
        if (player.vx < -player.speed) player.vx = -player.speed;

        if ((keys.current['ArrowUp'] || keys.current['KeyW'] || keys.current['Space']) && player.grounded) {
          player.vy = -jumpPower;
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
              if (player.vy > 0 && player.y < p.y) { 
                player.y = p.y - player.height; player.vy = 0; player.grounded = true; if (wasInAir) squashRef.current = 0.6;
              }
              else if (player.vy < 0 && player.y > p.y) { player.y = p.y + p.height; player.vy = 0; }
            } else {
              if (player.vx > 0) player.x = p.x - player.width;
              else if (player.vx < 0) player.x = p.x + p.width;
            }
          }
        }
        squashRef.current += (1 - squashRef.current) * 0.09;
        if (player.x < 0) player.x = 0;
        if (player.y > canvas.height + 500) {
          player.x = 200; player.y = canvas.height - 300; player.vy = 0; 
        }
      }
    };

    const draw = () => {
      const player = playerRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cameraX = Math.max(0, player.x - canvas.width / 4);
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#1a2a6c'); grad.addColorStop(0.5, '#b21f1f'); grad.addColorStop(1, '#fdbb2d');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!gameStarted) return; 

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

      ctx.save();
      const centerX = player.x + player.width / 2;
      const centerY = player.y + player.height;
      let sy = squashRef.current;
      let sx = 1 / sy;
      if (!player.grounded) {
        const speedF = Math.min(Math.abs(player.vy) * 0.015, 0.25);
        sy = 1 + speedF; sx = 1 - speedF;
      }
      ctx.translate(centerX, centerY);
      ctx.scale(sx, sy);
      ctx.translate(-centerX, -centerY);
      ctx.fillStyle = player.color;
      ctx.beginPath();
      const r = 8;
      ctx.moveTo(player.x + r, player.y);
      ctx.lineTo(player.x + player.width - r, player.y);
      ctx.quadraticCurveTo(player.x + player.width, player.y, player.x + player.width, player.y + r);
      ctx.lineTo(player.x + player.width, player.y + player.height - r);
      ctx.quadraticCurveTo(player.x + player.width, player.y + player.height, player.x + player.width - r, player.y + player.height);
      ctx.lineTo(player.x + r, player.y + player.height);
      ctx.quadraticCurveTo(player.x, player.y + player.height, player.x, player.y + player.height - r);
      ctx.lineTo(player.x, player.y + r);
      ctx.quadraticCurveTo(player.x, player.y, player.x + r, player.y);
      ctx.fill();
      ctx.fillStyle = 'white';
      const ex = player.vx > 0.1 ? player.x + 20 : player.vx < -0.1 ? player.x + 4 : player.x + 12;
      ctx.fillRect(ex, player.y + 10, 8, 8);
      ctx.fillStyle = 'black';
      ctx.fillRect(ex + (player.vx >= 0 ? 4 : 0), player.y + 12, 4, 4);
      ctx.restore();
      ctx.restore();

      if (isAdmin && isEditorOpen) {
        ctx.fillStyle = 'white'; ctx.font = 'bold 14px Arial';
        ctx.fillText('MOD: EDİTÖR AKTİF', 20, 60);
      }
    };

    const gameLoop = (currentTime: number) => {
      const frameTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      accumulator += Math.min(frameTime, 0.25);
      while (accumulator >= fixedDt) {
        updatePhysics();
        accumulator -= fixedDt;
      }
      draw();
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    animationFrameId = requestAnimationFrame(gameLoop);

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
      window.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAdmin, isEditorOpen, draggedIndex, isProceduralUsed, gameStarted]);

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
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }} onContextMenu={(e) => e.preventDefault()}>
      <canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none', WebkitTouchCallout: 'none' }} onContextMenu={(e) => e.preventDefault()} />
      
      {!gameStarted && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 3000, color: 'white', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '30px', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>Happy Guys 2D</h1>
          <button onClick={() => setGameStarted(true)} style={{ padding: '20px 50px', fontSize: '24px', fontWeight: 'bold', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', transition: 'transform 0.1s' }} onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')} onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}>OYUNA BAŞLA</button>
          <p style={{ marginTop: '20px', color: '#ccc' }}>Klavye veya mobil butonlarla kontrol edin</p>
        </div>
      )}

      {gameStarted && (
        <>
          <button onClick={generateProceduralMap} onContextMenu={(e) => e.preventDefault()} style={{ position: 'absolute', top: '10px', right: '10px', background: '#4CAF50', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', zIndex: 1000 }}>✨ Yeni Harita Oluştur</button>
          {isAdmin && isEditorOpen && (
            <div onContextMenu={(e) => e.preventDefault()} style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '100%', background: 'rgba(0,0,0,0.9)', color: 'white', padding: '20px', overflowY: 'auto', borderLeft: '2px solid #FFD700', zIndex: 2000 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>Editör</h3><button onClick={() => setIsEditorOpen(false)} style={{ color: 'red', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button></div>
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
                <button onClick={saveMap} style={{ width: '100%', padding: '12px', background: '#2196F3', color: 'white', border: 'none', fontWeight: 'bold' }}>💾 Kaydet</button>
                <button onClick={copyMapJSON} style={{ width: '100%', padding: '12px', background: '#9C27B0', color: 'white', border: 'none', fontWeight: 'bold' }}>📄 JSON Kopyala</button>
                <button onClick={resetMap} style={{ width: '100%', padding: '12px', background: '#f44336', color: 'white', border: 'none', fontWeight: 'bold' }}>⚠️ Haritayı Sıfırla</button>
              </div>
            </div>
          )}
          {!isEditorOpen && (
            <>
              <div style={{ position: 'absolute', bottom: '30px', left: '30px', display: 'flex', gap: '20px' }}>
                <div onPointerDown={(e) => { e.preventDefault(); keys.current['ArrowLeft'] = true; }} onPointerUp={(e) => { e.preventDefault(); keys.current['ArrowLeft'] = false; }} onPointerLeave={(e) => { e.preventDefault(); keys.current['ArrowLeft'] = false; }} onContextMenu={(e) => e.preventDefault()} style={{ width: '70px', height: '70px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '35px', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'none' }}>←</div>
                <div onPointerDown={(e) => { e.preventDefault(); keys.current['ArrowRight'] = true; }} onPointerUp={(e) => { e.preventDefault(); keys.current['ArrowRight'] = false; }} onPointerLeave={(e) => { e.preventDefault(); keys.current['ArrowRight'] = false; }} onContextMenu={(e) => e.preventDefault()} style={{ width: '70px', height: '70px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '35px', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'none' }}>→</div>
              </div>
              <div onPointerDown={(e) => { e.preventDefault(); keys.current['Space'] = true; }} onPointerUp={(e) => { e.preventDefault(); keys.current['Space'] = false; }} onPointerLeave={(e) => { e.preventDefault(); keys.current['Space'] = false; }} onContextMenu={(e) => e.preventDefault()} style={{ position: 'absolute', bottom: '30px', right: '30px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'none' }}>JUMP</div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Game;
