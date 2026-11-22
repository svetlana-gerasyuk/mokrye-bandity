(() => {
  const group = document.querySelector('#service-choices');
  const date = document.querySelector('#visit-date');
  const time = document.querySelector('#visit-time');
  const message = document.querySelector('#message');
  const countLabel = document.querySelector('#choice-summary');
  const copyButton = document.querySelector('#copy-message');
  const vkLink = document.querySelector('#open-vk');
  const copyStatus = document.querySelector('#copy-status');
  const checks = Array.from(group.querySelectorAll('input[type="checkbox"]'));
  let manualEdit = false;

  // Multiselect: each service is independent, never replaces the others.
  const selected = () => checks.filter(input => input.checked).map(input => input.value);
  const formatDate = (iso) => {
    if (!iso) return '';
    const [year, month, day] = iso.split('-');
    return `${day}.${month}.${year}`;
  };
  const createText = () => {
    const picked = selected();
    const serviceLine = picked.length ? `Интересуют услуги: ${picked.join(', ')}.` : 'Хочу уточнить доступные услуги.';
    const when = [date.value ? `дата ${formatDate(date.value)}` : '', time.value ? `время около ${time.value}` : ''].filter(Boolean);
    return `Здравствуйте! Хочу уточнить стоимость и возможность записи в автомойку «Мокрые бандиты».\n${serviceLine}${when.length ? `\nУдобное время для визита: ${when.join(', ')}.` : ''}\nПодскажите, пожалуйста, можно ли записаться? Спасибо!`;
  };
  const update = () => {
    const n = selected().length;
    countLabel.textContent = n ? `Выбрано услуг: ${n} · можно отметить ещё` : 'Ничего не выбрано — можно просто уточнить услуги';
    if (!manualEdit) message.value = createText();
  };
  group.addEventListener('change', () => { manualEdit = false; update(); });
  const today = new Date();
  date.min = [today.getFullYear(), String(today.getMonth()+1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  for (const input of [date, time]) input.addEventListener('change', () => { manualEdit = false; update(); });
  message.addEventListener('input', () => { manualEdit = true; });

  // Clicking a service card adds it to already chosen services.
  document.querySelectorAll('[data-pick]').forEach(link => link.addEventListener('click', () => {
    const match = checks.find(input => input.value === link.dataset.pick);
    if (match) match.checked = true;
    manualEdit = false;
    update();
  }));

  // Compatible with both https and file://. Clipboard fallback is synchronous
  // to avoid losing the user gesture before opening VK.
  const copyCurrent = () => {
    const text = message.value.trim();
    if (!text) { copyStatus.textContent = 'Введите сообщение для записи.'; return false; }
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;width:1px;height:1px;';
    document.body.append(field); field.focus(); field.select();
    let success = false;
    try { success = document.execCommand('copy'); } catch (_) {}
    field.remove();
    if (!success && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => { copyStatus.textContent = 'Текст скопирован — вставьте его в сообщение ВК.'; }).catch(() => {});
    }
    copyStatus.textContent = success
      ? 'Текст скопирован! Вставьте его в сообщения ВКонтакте. Запись подтвердит администратор.'
      : 'Если автоматическое копирование недоступно, выделите текст и скопируйте вручную.';
    return success;
  };
  copyButton.addEventListener('click', copyCurrent);
  vkLink.addEventListener('click', copyCurrent); // native link opens VK without blocking

  const hdr = document.querySelector('.site-header');
  window.addEventListener('scroll', () => hdr.classList.toggle('is-scrolled', scrollY > 10), { passive:true });
  update();

  // Автоцикл мойки на первом экране: пена → струя воды → чистый блеск → пар → снова пена.
  // Запускается сам, повторяется бесшовно, ставится на паузу вне экрана и в свёрнутой вкладке.
  const stage = document.querySelector('#wash-stage');
  const stageTag = document.querySelector('#wash-stage-tag');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const droplets = stage.querySelector('.wash-droplets');
  for (let i=0; i<26; i++) {
    const d = document.createElement('i');
    const v = (i * 23) % 97;
    d.style.cssText = `--d-top:${8 + v*.85}%;--d-lag:${(i%7)*0.07}s;--d-size:${3 + (i%5)*2}px;--d-angle:${-55 + (i%13)*9}deg;`;
    droplets.appendChild(d);
  }

  if (reducedMotion) {
    stage.classList.add('is-clean');
    stageTag.textContent = 'ПОСЛЕ · ЧИСТЫЙ БЛЕСК';
  } else {
    const FOAM_HOLD = 1900, WASH_MS = 3450, CLEAN_HOLD = 2800, RESET_MS = 1550;
    let timers = [], cycling = false, inView = true, pageVisible = !document.hidden;
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const after = (ms, fn) => timers.push(setTimeout(fn, ms));
    const canRun = () => inView && pageVisible && !cycling;

    const stepFoam = () => {
      cycling = true; clearTimers();
      stage.classList.remove('is-washing', 'is-clean', 'is-resetting');
      stageTag.textContent = 'ДО · АВТОМОБИЛЬ В ПЕНЕ';
      after(FOAM_HOLD, stepWash);
    };
    const stepWash = () => {
      stage.classList.add('is-washing');
      stageTag.textContent = 'СМЫВАЕМ ПЕНУ';
      after(WASH_MS, stepClean);
    };
    const stepClean = () => {
      stage.classList.remove('is-washing');
      stage.classList.add('is-clean');
      stageTag.textContent = 'ПОСЛЕ · ЧИСТЫЙ БЛЕСК';
      after(CLEAN_HOLD, stepReset);
    };
    const stepReset = () => {
      stage.classList.add('is-resetting');
      stageTag.textContent = 'СНОВА В ПЕНЕ';
      after(RESET_MS, () => { cycling = false; if (canRun()) stepFoam(); });
    };
    const tryStart = () => { if (canRun()) stepFoam(); };

    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) tryStart();
    }, { threshold: .2 }).observe(stage);
    document.addEventListener('visibilitychange', () => {
      pageVisible = !document.hidden;
      if (pageVisible) tryStart();
    });
    tryStart();
  }
})();


/* При наличии фото от владельца в assets/gallery/ автоматически заменяем демонстрационные изображения.
   Имена: 01.jpg ... 04.jpg (также webp/png/jpeg). Без загрузки с внешних ресурсов. */
(() => {
  const cards = [...document.querySelectorAll('[data-gallery-slot]')];
  const ext = ['jpg','jpeg','webp','png'];
  cards.forEach((card) => {
    const id = String(card.dataset.gallerySlot).padStart(2,'0');
    const img = card.querySelector('[data-gallery-img]');
    const link = card.querySelector('[data-gallery-open]');
    let i = 0;
    const tryNext = () => {
      if(i >= ext.length) return;
      const path = `assets/gallery/${id}.${ext[i++]}`;
      const test = new Image();
      test.onload = () => {
        if(!test.naturalWidth) return;
        img.src = path; link.href = path;
        img.alt = 'Фото автомойки «Мокрые бандиты»';
        const cap = card.dataset.caption;
        card.querySelector('[data-gallery-caption]').textContent = cap || `Фото автомойки № ${Number(id)}`;
        const meta = card.dataset.meta;
        card.querySelector('[data-gallery-meta]').textContent = meta || 'Фото из сообщества ВКонтакте';
      };
      test.onerror = tryNext;
      test.src = path;
    };
    tryNext();
  });
})();
