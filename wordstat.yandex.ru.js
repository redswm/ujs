(function() {
    'use strict';

    // ==========================================
    // 1. ИНИЦИАЛИЗАЦИЯ И НАБЛЮДАТЕЛЬ (REACT)
    // ==========================================
    function inject() {
        const wrap = document.querySelector('.save-button__wrapper');
        const btn = wrap?.querySelector('.save-button');
        if (!wrap || !btn || document.getElementById('ws-copy')) return false;

        createUI(wrap, btn);
        return true;
    }

    if (inject()) return;

    const startObserver = () => {
        const target = document.body || document.documentElement;
        if (!target) { setTimeout(startObserver, 100); return; }
        const obs = new MutationObserver(() => {
            if (document.querySelector('.save-button__wrapper')) { inject(); obs.disconnect(); }
        });
        obs.observe(target, { childList: true, subtree: true });
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', startObserver)
        : startObserver();

    // ==========================================
    // 2. СОЗДАНИЕ ИНТЕРФЕЙСА (КНОПКИ + ФОРМЫ)
    // ==========================================
    function createUI(wrap, originalBtn) {
        // КНОПКА "КОПИРОВАТЬ"
        const copyBtn = originalBtn.cloneNode(true);
        copyBtn.id = 'ws-copy';
        copyBtn.style.marginRight = '6px';
        copyBtn.innerHTML = '<span class="Button2-Text">Копировать</span>';
        copyBtn.style.transition = 'none'; copyBtn.style.transform = 'none';

        // КНОПКА "СКАЧАТЬ" (строго изолирована)
        const downloadBtn = copyBtn.cloneNode(true);
        downloadBtn.id = 'ws-download-btn';
        downloadBtn.innerHTML = '<span class="Button2-Text">Скачать</span>';

        // КНОПКА "СТОП-СЛОВА"
        const stopBtn = copyBtn.cloneNode(true);
        stopBtn.id = 'ws-stop-btn';
        stopBtn.innerHTML = '<span class="Button2-Text">Стоп-слова</span>';

        // КНОПКА "СТАТИСТИКА"
        const statsBtn = copyBtn.cloneNode(true);
        statsBtn.id = 'ws-stats-btn';
        statsBtn.innerHTML = '<span class="Button2-Text">Статистика</span>';

        // ==========================================
        // ФОРМА СТОП-СЛОВ
        // ==========================================
        const stopForm = document.createElement('div');
        stopForm.id = 'ws-stop-form';
        Object.assign(stopForm.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#fff', padding: '20px', borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: '99999',
            display: 'none', flexDirection: 'column', gap: '12px',
            width: '500px', maxWidth: '90vw', height: '400px',
            fontFamily: 'YS Text, Arial, sans-serif', boxSizing: 'border-box'
        });
        stopForm.innerHTML = `
            <h4 style="margin:0; font-size:16px; font-weight:600;">Стоп-слова</h4>
            <textarea id="ws-stop-input" spellcheck="false" style="width:100%; flex:1; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:14px; resize:none; font-family:monospace; line-height:1.4; box-sizing:border-box;" placeholder="Введите слова, каждое с новой строки или через пробел/табуляцию"></textarea>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button id="ws-stop-cancel" style="padding:8px 16px; border:1px solid #ccc; background:#f5f5f5; border-radius:6px; cursor:pointer;">Отмена</button>
                <button id="ws-stop-save" style="padding:8px 16px; border:none; background:#197eea; color:#fff; border-radius:6px; cursor:pointer;">Сохранить</button>
            </div>
        `;
        document.body.appendChild(stopForm);

        // ==========================================
        // ФОРМА СТАТИСТИКИ
        // ==========================================
        const statsForm = document.createElement('div');
        statsForm.id = 'ws-stats-form';
        Object.assign(statsForm.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#fff', padding: '20px', borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: '99999',
            display: 'none', flexDirection: 'column', gap: '12px',
            width: '600px', maxWidth: '90vw', height: '500px',
            fontFamily: 'YS Text, Arial, sans-serif', boxSizing: 'border-box'
        });
        statsForm.innerHTML = `
            <h4 style="margin:0; font-size:16px; font-weight:600;">Статистика слов</h4>
            <div id="ws-stats-content" style="flex:1; overflow:auto; border:1px solid #eee; border-radius:6px; padding:10px; font-family:monospace; font-size:14px; line-height:1.6;"></div>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button id="ws-stats-copy" style="padding:8px 16px; border:1px solid #197eea; background:#fff; color:#197eea; border-radius:6px; cursor:pointer;">Копировать (TSV)</button>
                <button id="ws-stats-close" style="padding:8px 16px; border:none; background:#197eea; color:#fff; border-radius:6px; cursor:pointer;">Закрыть</button>
            </div>
        `;
        document.body.appendChild(statsForm);

        // Загрузка сохранённых слов
        document.getElementById('ws-stop-input').value = localStorage.getItem('ws_stop_words') || '';

        // ==========================================
        // ОБРАБОТЧИКИ ФОРМ
        // ==========================================
        document.getElementById('ws-stop-cancel').onclick = () => stopForm.style.display = 'none';
        document.getElementById('ws-stop-save').onclick = () => {
            const raw = document.getElementById('ws-stop-input').value;
            const words = raw.split(/\s+/).map(w => w.trim()).filter(Boolean);
            localStorage.setItem('ws_stop_words', words.join('\n'));
            stopForm.style.display = 'none';
            showNotify(`Сохранено: ${words.length} слов`);
        };
        
        // Открытие/закрытие форм
        stopBtn.addEventListener('click', e => { e.preventDefault(); stopForm.style.display = stopForm.style.display === 'flex' ? 'none' : 'flex'; });
        document.getElementById('ws-stats-close').onclick = () => statsForm.style.display = 'none';

        // Кнопка копирования статистики (Формат: Фраза \t Частотность \n)
        document.getElementById('ws-stats-copy').onclick = async () => {
            const content = document.getElementById('ws-stats-content');
            const rows = content.querySelectorAll('div[style*="display:flex"]');
            const tsv = Array.from(rows).map(row => {
                const span = row.querySelector('span');
                const strong = row.querySelector('strong');
                return span && strong ? `${span.textContent.trim()}\t${strong.textContent.trim()}` : row.textContent.trim();
            }).join('\n');
            await navigator.clipboard.writeText(tsv);
            showNotify('Статистика скопирована (TSV)');
        };

        // Генерация статистики
        statsBtn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const wrapper = document.querySelector('.table__wrapper');
            if (!wrapper) return showNotify('Таблица не найдена');

            const cells = Array.from(wrapper.querySelectorAll('tr td:first-child, [class*="row"] > *:first-child, tbody tr > *:first-child'));
            const rawPhrases = cells.map(c => c.textContent.trim()).filter(Boolean);
            const allWords = rawPhrases.flatMap(p => p.toLowerCase().split(/\s+/).filter(Boolean));

            const freq = {};
            allWords.forEach(w => freq[w] = (freq[w] || 0) + 1);
            const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

            const content = document.getElementById('ws-stats-content');
            content.innerHTML = sorted.length
                ? sorted.map(([word, count]) => `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #eee;"><span>${escapeHtml(word)}</span><strong>${count}</strong></div>`).join('')
                : '<div style="text-align:center; color:#888; padding:20px;">Нет данных</div>';
            statsForm.style.display = 'flex';
        });

        // Закрытие по Esc
        document.addEventListener('keydown', e => { if (e.key === 'Escape') { stopForm.style.display = 'none'; statsForm.style.display = 'none'; } });

        // Закрытие при клике вне формы (исправлено мгновенное схлопывание)
        window.addEventListener('click', e => {
            if (stopForm.style.display === 'flex' && !stopForm.contains(e.target) && e.target !== stopBtn) stopForm.style.display = 'none';
            if (statsForm.style.display === 'flex' && !statsForm.contains(e.target) && e.target !== statsBtn) statsForm.style.display = 'none';
        });

        // ==========================================
        // 3. ЛОГИКА КОПИРОВАНИЯ
        // ==========================================
        copyBtn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            const textSpan = copyBtn.querySelector('.Button2-Text');
            const originalText = textSpan.textContent;
            try {
                const stopRaw = localStorage.getItem('ws_stop_words') || '';
                const stopWords = stopRaw.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
                const wrapper = document.querySelector('.table__wrapper');
                if (!wrapper) return showNotify('Таблица не найдена');

                const cells = Array.from(wrapper.querySelectorAll('tr td:first-child, [class*="row"] > *:first-child, tbody tr > *:first-child'));
                const rawItems = cells.map(c => c.textContent.trim()).filter(Boolean);
                const filtered = stopWords.length > 0 ? rawItems.filter(t => !stopWords.some(sw => t.toLowerCase().includes(sw))) : rawItems;

                if (document.querySelector('.wordstat__show-more-button')) showNotify('⚠️ Показаны не все запросы');
                await navigator.clipboard.writeText(filtered.join('\n'));
                textSpan.textContent = `✓ ${filtered.length}`;
                setTimeout(() => textSpan.textContent = originalText, 1200);
            } catch {
                textSpan.textContent = 'Ошибка';
                setTimeout(() => textSpan.textContent = originalText, 1200);
            }
        });

        // ==========================================
        // 4. ЛОГИКА СКАЧИВАНИЯ (Исправлено)
        // ==========================================
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            const textSpan = downloadBtn.querySelector('.Button2-Text');
            textSpan.textContent = '⏳';
            
            const saveBtn = document.querySelector('.save-button');
            if (!saveBtn) return showNotify('❌ Кнопка "Скачать" не найдена');
            
            saveBtn.click(); // Открываем меню
            
            let attempts = 0;
            const checkXlsx = setInterval(() => {
                attempts++;
                // Ищем по нескольким возможным селекторам
                const xlsxBtn = document.querySelector('.save-xlsx-button') || 
                                document.querySelector('[class*="xlsx"]') || 
                                document.querySelector('[data-type="xlsx"]');
                                
                if (xlsxBtn) {
                    clearInterval(checkXlsx);
                    console.log('[WS] ✅ Найдена кнопка XLSX:', xlsxBtn.className);
                    xlsxBtn.click();
                    textSpan.textContent = 'Скачать';
                    showNotify('Загрузка начата');
                } else if (attempts >= 20) { // 1000мс
                    clearInterval(checkXlsx);
                    textSpan.textContent = 'Скачать';
                    console.warn('[WS] ❌ .save-xlsx-button не найдена. Доступные кнопки:');
                    document.querySelectorAll('[class*="save"], [class*="download"], [class*="xlsx"]').forEach(b => console.log(' ', b.className, b.textContent.trim()));
                    showNotify('⚠️ Меню не открылось. Кликните "Скачать" вручную.');
                }
            }, 50);
        });

        // Вставляем кнопки
        wrap.insertBefore(statsBtn, originalBtn);
        wrap.insertBefore(stopBtn, originalBtn);
        wrap.insertBefore(downloadBtn, originalBtn);
        wrap.insertBefore(copyBtn, originalBtn);
    }

    // ==========================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ==========================================
    function showNotify(msg) {
        let el = document.getElementById('ws-notify');
        if (!el) {
            el = document.createElement('div');
            el.id = 'ws-notify';
            Object.assign(el.style, {
                position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                background: '#222', color: '#fff', padding: '12px 20px', borderRadius: '10px',
                fontSize: '14px', zIndex: '100000', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                transition: 'opacity 0.2s', opacity: '0'
            });
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => el.style.opacity = '0', 2500);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
