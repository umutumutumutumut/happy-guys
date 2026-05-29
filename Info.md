  2D Platformer Uygulama Planı

  Hedef
  React, TypeScript ve HTML5 Canvas API kullanarak görsel olarak çekici, 2 boyutlu, kontrol edilebilir bir karaktere sahip platformer (Mario tarzı) bir ortam oluşturmak.

  Önemli Dosyalar ve Bağlam
  Şu an boş olan /Users/Umut/Desktop/Happy Guys dizininde Vite kullanılarak yeni bir proje başlatılacak.

   * src/components/Game.tsx: Canvas'ı ve oyun döngüsünü (game loop) barındıran ana oyun bileşeni.
   * src/App.tsx: Uygulamanın kök bileşeni.
   * src/index.css: Tam ekran görünümü için gerekli sıfırlamaları içeren global stiller.

  Uygulama Adımları

  1. Proje Kurulumu
   * Vite + React + TypeScript kullanılarak sıfırdan bir proje oluşturulacak.
   * App.tsx ve index.css içindeki gereksiz Vite başlangıç kodları temizlenecek.
   * Tarayıcıda tam ekran görünmesi için CSS ayarları yapılacak (margin 0, overflow hidden).

  2. Canvas ve Oyun Döngüsü
   * Game.tsx bileşeni oluşturulacak.
   * Bir <canvas> elementi eklenip useRef ile React'a bağlanacak.
   * Ekran boyutu değiştiğinde canvas'ın da boyutunu güncelleyecek bir resize dinleyicisi eklenecek.
   * requestAnimationFrame kullanılarak saniyede 60 kare (60fps) hedefleyen ana oyun döngüsü kurulacak.

  3. Karakter (Entity) ve Fizik
   * Oyuncu (Player): Pozisyon (x, y), boyut (width, height), hız (velocityX, velocityY), hareket hızı (speed) ve zıplama gücü (jumpPower) gibi özellikleri tanımlanacak.
   * Ortam (Platformlar): Üzerinde zıplanabilecek zemin ve havada duran platformlardan oluşan bir dizi nesne (x, y, width, height, color) oluşturulacak.
   * Fizik Kuralları: 
       * Oyuncunun Y eksenindeki hızına sürekli yerçekimi (gravity) uygulanacak.
       * Hareket edilmediğinde karakterin yumuşakça durması için X eksenine sürtünme (friction) uygulanacak.
       * Oyuncunun pozisyonu, mevcut hızına göre her karede güncellenecek.

  4. Girdi (Input) Kontrolleri
   * Klavye tuşlarına basıldığını (keydown) ve bırakıldığını (keyup) algılayacak dinleyiciler eklenecek.
   * Sol (A veya Sol Ok), Sağ (D veya Sağ Ok) ve Zıplama (W, Yukarı Ok veya Boşluk) tuşlarının anlık durumu takip edilecek.

  5. Çarpışma Tespiti (Collision Detection)
   * Oyuncu ile platformlar arasında Kutu Çarpışması (AABB - Axis-Aligned Bounding Box) hesaplaması yapılacak.
   * Karakterin platformların içinden geçmesini engellemek ve sadece yere değdiğinde (grounded) zıplayabilmesini sağlamak için üst, alt, sağ ve sol çarpışma durumları ele alınacak.

  6. Çizim (Rendering)
   * Her kare çiziminden önce canvas temizlenecek.
   * Görsel bir arka plan çizilecek (örneğin gökyüzü gradyanı).
   * Platformlar ekrana çizilecek.
   * Oyuncu karakteri (başlangıç için basit bir renkli kutu) ekrana çizilecek.