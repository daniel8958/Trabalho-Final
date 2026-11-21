(() => {
    const GAME_KEY = 'gamevault_jogos';
    const WISH_KEY = 'gamevault_desejos';
    const page = document.body.dataset.page;
    const $ = selector => document.querySelector(selector);
    const byId = id => document.getElementById(id);
    const statusNames = {
        'jogando': 'Jogando',
        'zerado': 'Zerado',
        'quero-jogar': 'Quero jogar',
        'pausado': 'Pausado'
    };
    const gamesSuggested = ['Hollow Knight', 'Celeste', 'Minecraft', 'Stardew Valley', 'Hades', 'Terraria'];
    let refresh = () => {};
    let toastTimer;

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    function safeURL(value) {
        try {
            const url = new URL(String(value));
            return url.protocol === 'https:' ? url.href : '';
        } catch {
            return '';
        }
    }

    function makeId() {
        return `gv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function readArray(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    function store(key, list) {
        try {
            localStorage.setItem(key, JSON.stringify(list));
            return true;
        } catch {
            toast('Não foi possível salvar. Verifique o espaço do navegador.');
            return false;
        }
    }

    function number(value, otherwise = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : otherwise;
    }

    function normalizeGame(raw, index) {
        const statuses = {
            'Jogando': 'jogando', 'Zerado': 'zerado',
            'Quero jogar': 'quero-jogar', 'Pausado': 'pausado'
        };
        const chosen = statuses[raw.status] || raw.status || 'quero-jogar';
        return {
            id: String(raw.id || `antigo-${index}`),
            name: String(raw.name || raw.nome || 'Jogo sem nome'),
            genre: String(raw.genre || raw.genero || 'Outros'),
            platform: String(raw.platform || raw.plataforma || 'PC'),
            status: statusNames[chosen] ? chosen : 'quero-jogar',
            progress: Math.max(0, Math.min(100, number(raw.progress ?? raw.progresso))),
            hours: Math.max(0, number(raw.hours ?? raw.horas)),
            rating: raw.rating === null || raw.rating === '' || raw.rating === undefined
                ? (raw.nota === null || raw.nota === '' || raw.nota === undefined ? null : number(raw.nota))
                : number(raw.rating),
            favorite: Boolean(raw.favorite ?? raw.favorito),
            wishlist: Boolean(raw.wishlist ?? raw.desejo),
            createdAt: String(raw.createdAt || raw.criadoEm || new Date().toISOString())
        };
    }

    function getGames() {
        return readArray(GAME_KEY).filter(item => item && typeof item === 'object')
            .map((item, index) => normalizeGame(item, index));
    }

    function saveGames(games) {
        return store(GAME_KEY, games);
    }

    function updateGame(id, changes) {
        const games = getGames();
        const game = games.find(item => item.id === id);
        if (!game) return;
        Object.assign(game, changes);
        if (saveGames(games)) {
            refresh();
            toast('Biblioteca atualizada.');
        }
    }

    function toast(message) {
        const element = byId('toast');
        if (!element) return;
        element.textContent = message;
        element.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => element.classList.remove('visible'), 3000);
    }

    function emptyState(text, action = true) {
        return `<div class="empty-state"><div class="empty-icon">🎮</div><h3>Por enquanto, nada aqui</h3><p>${escapeHTML(text)}</p>${action ? '<a class="btn btn-primary" href="adicionar.html">Adicionar um jogo</a>' : ''}</div>`;
    }

    function statCard(label, value, symbol = '◆') {
        return `<div class="stat-card"><div class="stat-top"><span>${escapeHTML(label)}</span><span class="stat-icon">${symbol}</span></div><strong>${escapeHTML(value)}</strong><small>${label === 'Horas jogadas' ? 'Horas registradas na biblioteca' : 'Na sua coleção pessoal'}</small></div>`;
    }

    function gameCard(game, view = 'biblioteca') {
        const id = escapeHTML(game.id);
        const label = statusNames[game.status] || 'Quero jogar';
        const variation = (game.name.length + game.platform.length) % 5;
        let actions = '';
        if (view === 'biblioteca') {
            actions = `<a class="btn btn-small btn-secondary" href="adicionar.html?id=${encodeURIComponent(game.id)}">Editar</a><button type="button" class="btn btn-small btn-outline" data-action="favorite" data-id="${id}">${game.favorite ? '♥ Favorito' : '♡ Favoritar'}</button><button type="button" class="btn btn-small danger-btn" data-action="delete" data-id="${id}">Excluir</button>`;
        } else if (view === 'zerados') {
            actions = `<button type="button" class="btn btn-small btn-secondary" data-action="unfinish" data-id="${id}">Voltar a jogar</button><a class="btn btn-small btn-outline" href="adicionar.html?id=${encodeURIComponent(game.id)}">Editar</a>`;
        } else if (view === 'backlog') {
            actions = `<button type="button" class="btn btn-small btn-primary" data-action="start" data-id="${id}">Começar a jogar</button><a class="btn btn-small btn-outline" href="adicionar.html?id=${encodeURIComponent(game.id)}">Editar</a>`;
        } else if (view === 'favoritos') {
            actions = `<button type="button" class="btn btn-small btn-outline" data-action="favorite" data-id="${id}">Remover favorito</button>`;
        } else {
            actions = `<a class="btn btn-small btn-secondary" href="adicionar.html?id=${encodeURIComponent(game.id)}">Ver / editar</a>`;
        }
        return `<article class="game-card"><div class="cover variation-${variation}"><span class="status-pill">${escapeHTML(label)}</span><span class="cover-icon">🎮</span></div><div class="game-body"><h3>${escapeHTML(game.name)}</h3><p class="game-meta">${escapeHTML(game.genre)} · ${escapeHTML(game.platform)}</p><div class="game-progress"><span style="width:${game.progress}%"></span></div><p class="game-details">${game.progress}% concluído · ${game.hours.toLocaleString('pt-BR')}h${game.rating !== null ? ` · ★ ${game.rating}/10` : ''}</p><div class="game-actions">${actions}</div></div></article>`;
    }

    function drawGrid(id, games, view, message) {
        const target = byId(id);
        if (target) target.innerHTML = games.length
            ? games.map(game => gameCard(game, view)).join('')
            : emptyState(message || 'Adicione um jogo para começar.');
    }

    function putCount(id, count) {
        const target = byId(id);
        if (target) target.textContent = `(${count})`;
    }

    function setupMenu() {
        const button = byId('open-menu');
        const sidebar = byId('sidebar');
        const overlay = byId('sidebar-overlay');
        if (!button || !sidebar || !overlay) return;
        const toggle = open => {
            sidebar.classList.toggle('open', open);
            overlay.classList.toggle('open', open);
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
        };
        button.addEventListener('click', () => toggle(!sidebar.classList.contains('open')));
        overlay.addEventListener('click', () => toggle(false));
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') toggle(false);
        });
    }

    function setupGameActions() {
        document.addEventListener('click', event => {
            const button = event.target.closest('[data-action]');
            if (!button) return;
            const id = button.dataset.id;
            const action = button.dataset.action;
            const game = getGames().find(item => item.id === id);
            if (action === 'remove-wish') {
                const wishes = readArray(WISH_KEY);
                if (store(WISH_KEY, wishes.filter(item => item.id !== id))) {
                    refresh();
                    toast('Jogo removido da lista de desejos.');
                }
                return;
            }
            if (action === 'remove-game-wish' && game) {
                updateGame(id, {wishlist: false});
                return;
            }
            if (!game) return;
            if (action === 'favorite') updateGame(id, {favorite: !game.favorite});
            if (action === 'start') updateGame(id, {status: 'jogando'});
            if (action === 'finish') updateGame(id, {status: 'zerado', progress: 100});
            if (action === 'pause') updateGame(id, {status: 'pausado'});
            if (action === 'unfinish') updateGame(id, {status: 'jogando', progress: Math.min(game.progress, 95)});
            if (action === 'delete') {
                if (confirm(`Excluir "${game.name}" da biblioteca?`)) {
                    const updated = getGames().filter(item => item.id !== id);
                    if (saveGames(updated)) {
                        refresh();
                        toast('Jogo excluído da biblioteca.');
                    }
                }
            }
        });
    }

    function setupHome() {
        const suggestions = [...gamesSuggested];
        refresh = () => {
            const games = getGames();
            const playing = games.filter(game => game.status === 'jogando').length;
            const finished = games.filter(game => game.status === 'zerado').length;
            byId('home-stats').innerHTML = [
                statCard('Jogos cadastrados', games.length, '▣'),
                statCard('Jogando agora', playing, '▶'),
                statCard('Jogos zerados', finished, '✓'),
                statCard('Meus favoritos', games.filter(game => game.favorite).length, '♥')
            ].join('');
            drawGrid('recent-grid', games.slice(-4).reverse(), 'recent', 'Sua coleção ainda está vazia. Que tal cadastrar o primeiro jogo?');
        };
        byId('random-game').addEventListener('click', () => {
            const titles = getGames().map(game => game.name);
            const source = titles.length ? titles : suggestions;
            const pick = source[Math.floor(Math.random() * source.length)];
            byId('surprise-result').textContent = `Sua sugestão de hoje: ${pick}!`;
        });
        refresh();
    }

    function setupLibrary() {
        const search = byId('library-search');
        const filter = byId('library-status');
        refresh = () => {
            const text = search.value.trim().toLocaleLowerCase('pt-BR');
            const games = getGames().filter(game =>
                game.name.toLocaleLowerCase('pt-BR').includes(text) &&
                (filter.value === 'todos' || game.status === filter.value)
            ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            drawGrid('library-grid', games, 'biblioteca', 'Nenhum jogo encontrado com esses filtros.');
            putCount('library-count', games.length);
        };
        search.addEventListener('input', refresh);
        filter.addEventListener('change', refresh);
        byId('clear-library').addEventListener('click', () => {
            if (!getGames().length) return toast('Sua biblioteca já está vazia.');
            if (confirm('Tem certeza de que deseja apagar todos os jogos? Esta ação não pode ser desfeita.')) {
                if (saveGames([])) {
                    refresh();
                    toast('Biblioteca apagada.');
                }
            }
        });
        refresh();
    }

    function setupAdd() {
        const form = byId('game-form');
        const params = new URLSearchParams(location.search);
        const id = params.get('id');
        const existing = getGames().find(game => game.id === id);
        if (existing) {
            byId('game-id').value = existing.id;
            byId('game-name').value = existing.name;
            byId('game-genre').value = existing.genre;
            byId('game-platform').value = existing.platform;
            byId('game-status').value = existing.status;
            byId('game-progress').value = existing.progress;
            byId('game-hours').value = existing.hours;
            byId('game-rating').value = existing.rating === null ? '' : existing.rating;
            byId('game-favorite').checked = existing.favorite;
            byId('game-wishlist').checked = existing.wishlist;
            $('button[type="submit"]').textContent = 'Salvar alterações';
        }
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            const name = byId('game-name').value.trim();
            if (!name) return;
            const status = byId('game-status').value;
            const ratingInput = byId('game-rating').value;
            const rating = ratingInput === '' ? null : Math.max(0, Math.min(10, number(ratingInput)));
            const games = getGames();
            const previous = games.find(game => game.id === byId('game-id').value);
            const game = {
                id: previous?.id || makeId(),
                name, genre: byId('game-genre').value, platform: byId('game-platform').value,
                status,
                progress: status === 'zerado' ? 100 : Math.max(0, Math.min(100, number(byId('game-progress').value))),
                hours: Math.max(0, number(byId('game-hours').value)),
                rating,
                favorite: byId('game-favorite').checked,
                wishlist: byId('game-wishlist').checked,
                createdAt: previous?.createdAt || new Date().toISOString()
            };
            if (previous) {
                Object.assign(previous, game);
            } else {
                games.push(game);
            }
            if (saveGames(games)) {
                byId('form-message').innerHTML = `Jogo salvo com sucesso! <a class="text-link" href="biblioteca.html">Ver na biblioteca →</a>`;
                toast('Jogo salvo na sua biblioteca!');
                if (!previous) form.reset();
            }
        });
    }

    function setupPlaying() {
        refresh = () => {
            const games = getGames().filter(game => game.status === 'jogando');
            putCount('playing-count', games.length);
            byId('playing-list').innerHTML = games.length ? games.map(game => `<article class="list-row"><div class="list-icon">🎮</div><div class="list-main"><h3>${escapeHTML(game.name)}</h3><p>${escapeHTML(game.platform)} · ${escapeHTML(game.genre)}</p><div class="list-actions"><button type="button" class="btn btn-small btn-secondary" data-action="finish" data-id="${escapeHTML(game.id)}">Marcar como zerado</button><button type="button" class="btn btn-small btn-outline" data-action="pause" data-id="${escapeHTML(game.id)}">Pausar</button></div></div><div class="list-right"><label for="progress-${escapeHTML(game.id)}">Progresso: <output id="output-${escapeHTML(game.id)}">${game.progress}%</output></label><input class="progress-range" id="progress-${escapeHTML(game.id)}" type="range" min="0" max="100" step="5" value="${game.progress}" data-progress-id="${escapeHTML(game.id)}"></div></article>`).join('') : emptyState('Nenhum jogo marcado como Jogando.');
        };
        const list = byId('playing-list');
        list.addEventListener('input', event => {
            const range = event.target.closest('[data-progress-id]');
            if (!range) return;
            const output = byId(`output-${range.dataset.progressId}`);
            if (output) output.textContent = `${range.value}%`;
        });
        list.addEventListener('change', event => {
            const range = event.target.closest('[data-progress-id]');
            if (!range) return;
            updateGame(range.dataset.progressId, {progress: number(range.value)});
        });
        refresh();
    }

    function setupFinished() {
        refresh = () => {
            const games = getGames().filter(game => game.status === 'zerado');
            const hours = games.reduce((sum, game) => sum + game.hours, 0);
            byId('finished-stats').innerHTML = statCard('Jogos zerados', games.length, '✓') + statCard('Horas jogadas', `${hours.toLocaleString('pt-BR')}h`, '◷');
            drawGrid('finished-grid', games, 'zerados', 'Quando terminar um jogo, marque-o como Zerado.');
        };
        refresh();
    }

    function setupBacklog() {
        refresh = () => {
            const games = getGames().filter(game => game.status === 'quero-jogar');
            putCount('backlog-count', games.length);
            drawGrid('backlog-grid', games, 'backlog', 'Sua lista de jogos para começar está vazia.');
        };
        byId('backlog-pick').addEventListener('click', () => {
            const games = getGames().filter(game => game.status === 'quero-jogar');
            byId('backlog-result').textContent = games.length
                ? `Que tal começar ${games[Math.floor(Math.random() * games.length)].name}?`
                : 'Adicione algum jogo com status Quero jogar para usar o sorteio.';
        });
        refresh();
    }

    function setupWishes() {
        const form = byId('wish-form');
        refresh = () => {
            const games = getGames().filter(game => game.wishlist);
            const other = readArray(WISH_KEY).filter(item => item && item.id && item.name);
            const names = new Set(games.map(game => game.name.toLocaleLowerCase('pt-BR')));
            const uniqueOther = other.filter(item => !names.has(String(item.name).toLocaleLowerCase('pt-BR')));
            putCount('wish-count', games.length + uniqueOther.length);
            const cards = [
                ...games.map(game => `<article class="game-card"><div class="cover variation-3"><span class="cover-icon">♡</span></div><div class="game-body"><h3>${escapeHTML(game.name)}</h3><p class="game-meta">${escapeHTML(game.platform)} · Na biblioteca</p><div class="game-actions"><button type="button" class="btn btn-small btn-outline" data-action="remove-game-wish" data-id="${escapeHTML(game.id)}">Remover da lista</button></div></div></article>`),
                ...uniqueOther.map(item => `<article class="game-card"><div class="cover variation-2"><span class="cover-icon">♡</span></div><div class="game-body"><h3>${escapeHTML(item.name)}</h3><p class="game-meta">Na sua lista de desejos</p><div class="game-actions"><button type="button" class="btn btn-small btn-outline" data-action="remove-wish" data-id="${escapeHTML(item.id)}">Remover da lista</button></div></div></article>`)
            ];
            byId('wish-grid').innerHTML = cards.length ? cards.join('') : emptyState('Adicione jogos que você quer conhecer ou comprar.', false);
        };
        form.addEventListener('submit', event => {
            event.preventDefault();
            const name = byId('wish-name').value.trim();
            if (!name) return;
            const existsInGames = getGames().some(game => game.wishlist && game.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'));
            const wishes = readArray(WISH_KEY);
            const existsInWishes = wishes.some(item => String(item.name).toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'));
            if (existsInGames || existsInWishes) {
                byId('wish-message').textContent = 'Este jogo já está na sua lista.';
                return;
            }
            wishes.push({id: makeId(), name, createdAt: new Date().toISOString()});
            if (store(WISH_KEY, wishes)) {
                form.reset();
                byId('wish-message').textContent = 'Jogo adicionado à lista de desejos!';
                refresh();
            }
        });
        refresh();
    }

    function setupRatings() {
        refresh = () => {
            const games = getGames();
            const rated = games.filter(game => game.rating !== null);
            const mean = rated.length ? (rated.reduce((sum, game) => sum + game.rating, 0) / rated.length).toFixed(1).replace('.', ',') : '—';
            byId('ratings-summary').innerHTML = statCard('Jogos avaliados', rated.length, '★') + statCard('Nota média', mean, '◆');
            byId('ratings-list').innerHTML = games.length ? games.map(game => `<article class="list-row"><div class="list-icon">★</div><div class="list-main"><h3>${escapeHTML(game.name)}</h3><p>${escapeHTML(game.genre)} · ${escapeHTML(game.platform)}</p></div><div class="list-right"><label for="rating-${escapeHTML(game.id)}">Sua nota</label><select class="select-small" id="rating-${escapeHTML(game.id)}" data-rating-id="${escapeHTML(game.id)}"><option value="">Sem nota</option>${Array.from({length: 11}, (_, i) => `<option value="${i}" ${game.rating === i ? 'selected' : ''}>${i}/10</option>`).join('')}</select></div></article>`).join('') : emptyState('Cadastre um jogo para começar a avaliar.');
        };
        byId('ratings-list').addEventListener('change', event => {
            const field = event.target.closest('[data-rating-id]');
            if (field) updateGame(field.dataset.ratingId, {rating: field.value === '' ? null : number(field.value)});
        });
        refresh();
    }

    function setupFavorites() {
        const form = byId('favorite-form');
        const select = byId('favorite-select');
        refresh = () => {
            const games = getGames();
            const available = games.filter(game => !game.favorite);
            select.innerHTML = available.length ? available.map(game => `<option value="${escapeHTML(game.id)}">${escapeHTML(game.name)}</option>`).join('') : '<option value="">Nenhum jogo disponível</option>';
            const favorites = games.filter(game => game.favorite);
            putCount('favorite-count', favorites.length);
            drawGrid('favorites-grid', favorites, 'favoritos', 'Ainda não há favoritos. Selecione um jogo acima para começar.');
        };
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (select.value) updateGame(select.value, {favorite: true});
            else byId('favorite-message').textContent = 'Cadastre mais jogos para adicionar favoritos.';
        });
        refresh();
    }

    function setupGenres() {
        let selected = 'todos';
        refresh = () => {
            const games = getGames();
            const genres = [...new Set(games.map(game => game.genre))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
            if (selected !== 'todos' && !genres.includes(selected)) selected = 'todos';
            byId('genre-chips').innerHTML = ['todos', ...genres].map(genre => `<button type="button" class="chip ${genre === selected ? 'selected' : ''}" data-genre="${escapeHTML(genre)}">${genre === 'todos' ? 'Todos' : escapeHTML(genre)}</button>`).join('');
            const filtered = selected === 'todos' ? games : games.filter(game => game.genre === selected);
            byId('genre-result').textContent = `${filtered.length} ${filtered.length === 1 ? 'jogo encontrado' : 'jogos encontrados'}`;
            drawGrid('genre-grid', filtered, 'genres', 'Nenhum jogo cadastrado neste gênero.');
        };
        byId('genre-chips').addEventListener('click', event => {
            const chip = event.target.closest('[data-genre]');
            if (chip) {selected = chip.dataset.genre; refresh();}
        });
        refresh();
    }

    function setupPlatforms() {
        const select = byId('platform-filter');
        refresh = () => {
            const games = getGames();
            const current = select.value;
            const platforms = [...new Set(games.map(game => game.platform))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
            select.innerHTML = '<option value="todas">Todas as plataformas</option>' + platforms.map(platform => `<option value="${escapeHTML(platform)}">${escapeHTML(platform)}</option>`).join('');
            select.value = platforms.includes(current) ? current : 'todas';
            const filtered = select.value === 'todas' ? games : games.filter(game => game.platform === select.value);
            byId('platform-result').textContent = `${filtered.length} ${filtered.length === 1 ? 'jogo encontrado' : 'jogos encontrados'}`;
            drawGrid('platform-grid', filtered, 'platforms', 'Nenhum jogo nesta plataforma.');
        };
        select.addEventListener('change', refresh);
        byId('platform-reset').addEventListener('click', () => {select.value = 'todas';refresh();});
        refresh();
    }

    function barChart(data) {
        const max = Math.max(1, ...data.map(item => item[1]));
        return data.length ? data.map(([label, quantity]) => `<div class="bar-item"><div class="bar-meta"><span>${escapeHTML(label)}</span><strong>${quantity}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${(quantity / max) * 100}%"></div></div></div>`).join('') : '<p>Adicione jogos para visualizar o gráfico.</p>';
    }

    function csvCell(value) {
        const raw = String(value ?? '');
        const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
        return `"${safe.replace(/"/g, '""')}"`;
    }

    function setupStatistics() {
        refresh = () => {
            const games = getGames();
            const hours = games.reduce((sum, game) => sum + game.hours, 0);
            byId('stats-overview').innerHTML = [
                statCard('Jogos cadastrados', games.length, '▣'),
                statCard('Horas jogadas', `${hours.toLocaleString('pt-BR')}h`, '◷'),
                statCard('Jogos zerados', games.filter(game => game.status === 'zerado').length, '✓'),
                statCard('Meus favoritos', games.filter(game => game.favorite).length, '♥')
            ].join('');
            byId('status-chart').innerHTML = barChart(Object.entries(statusNames).map(([id, label]) => [label, games.filter(game => game.status === id).length]));
            const genres = [...new Set(games.map(game => game.genre))].map(genre => [genre, games.filter(game => game.genre === genre).length]).sort((a, b) => b[1] - a[1]);
            byId('genre-chart').innerHTML = barChart(genres);
        };
        byId('export-csv').addEventListener('click', () => {
            const games = getGames();
            if (!games.length) {
                byId('export-message').textContent = 'Cadastre um jogo antes de exportar.';
                return;
            }
            const headings = ['Nome', 'Gênero', 'Plataforma', 'Status', 'Progresso', 'Horas', 'Nota', 'Favorito'];
            const rows = games.map(game => [game.name, game.genre, game.platform, statusNames[game.status], game.progress, game.hours, game.rating ?? '', game.favorite ? 'Sim' : 'Não']);
            const contents = '\uFEFF' + [headings, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
            const url = URL.createObjectURL(new Blob([contents], {type: 'text/csv;charset=utf-8'}));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'gamevault-biblioteca.csv';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            byId('export-message').textContent = 'Sua biblioteca foi exportada.';
        });
        refresh();
    }

    async function fetchJSON(url) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 14000);
        try {
            const response = await fetch(url, {signal: controller.signal});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    }

    function apiCard({title, subtitle, picture, badge, link, button, price}) {
        const image = safeURL(picture);
        const href = safeURL(link);
        return `<article class="game-card api-card"><div class="cover">${image ? `<img src="${escapeHTML(image)}" alt="Capa de ${escapeHTML(title)}" loading="lazy">` : '<span class="cover-icon">🎮</span>'}<span class="status-pill">${escapeHTML(badge)}</span></div><div class="game-body"><h3>${escapeHTML(title)}</h3><p class="game-meta">${escapeHTML(subtitle)}</p>${price ? `<p class="api-price">${escapeHTML(price)}</p>` : ''}<div class="game-actions">${href ? `<a class="btn btn-small btn-primary" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(button)}</a>` : ''}</div></div></article>`;
    }

    function setupDeals() {
        let deals = [];
        const button = byId('load-deals');
        const search = byId('deals-search');
        const discount = byId('big-discounts');
        const status = byId('deals-status');
        const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
        const money = cents => currency.format(number(cents) / 100);
        const draw = () => {
            const text = search.value.trim().toLocaleLowerCase('pt-BR');
            const filtered = deals.filter(item => item.name.toLocaleLowerCase('pt-BR').includes(text) && (!discount.checked || item.discount >= 50));
            byId('deals-grid').innerHTML = filtered.length ? filtered.map(item => apiCard({
                title: item.name,
                subtitle: `Desconto: ${item.discount}% · De ${money(item.original)}`,
                picture: item.image,
                badge: `${item.discount}% OFF`,
                link: `https://store.steampowered.com/app/${item.id}/?cc=br`,
                button: 'Ver na Steam',
                price: money(item.final)
            })).join('') : emptyState('Não há ofertas que correspondam a esses filtros.', false);
        };
        button.addEventListener('click', async () => {
            button.disabled = true;
            status.textContent = 'Carregando promoções...';
            try {
                const steamURL = 'https://store.steampowered.com/api/featuredcategories/?cc=br&l=brazilian';
                const data = await fetchJSON(`https://proxy.cors.dev/${steamURL}`);
                if (!data || !data.specials || !Array.isArray(data.specials.items)) throw new Error('Resposta inesperada');
                deals = data.specials.items.filter(item => {
                    const id = Number(item.id);
                    const original = Number(item.original_price);
                    const final = Number(item.final_price);
                    const pct = Number(item.discount_percent);
                    return Number.isInteger(id) && id > 0 && Number.isFinite(original) && Number.isFinite(final) && original > final && final >= 0 && Number.isFinite(pct) && pct > 0 && (!item.currency || item.currency === 'BRL');
                }).map(item => ({
                    id: Number(item.id),
                    name: String(item.name || 'Jogo sem título'),
                    original: Number(item.original_price),
                    final: Number(item.final_price),
                    discount: Math.round(Number(item.discount_percent)),
                    image: item.header_image || ''
                })).sort((a, b) => b.discount - a.discount);
                status.textContent = deals.length ? '' : 'Nenhuma promoção disponível no momento.';
                draw();
            } catch {
                deals = [];
                byId('deals-grid').innerHTML = '';
                status.innerHTML = 'Não foi possível carregar as promoções. <a href="https://store.steampowered.com/specials/?cc=br" target="_blank" rel="noopener noreferrer">Ver ofertas na Steam</a>.';
            } finally {
                button.disabled = false;
            }
        });
        search.addEventListener('input', () => {if (deals.length) draw();});
        discount.addEventListener('change', () => {if (deals.length) draw();});
        button.click();
    }

    function setupFreeGames() {
        let games = [];
        const button = byId('load-free');
        const search = byId('free-search');
        const genres = byId('free-genre');
        const status = byId('free-status');
        const draw = () => {
            const text = search.value.trim().toLocaleLowerCase('pt-BR');
            const filtered = games.filter(item => (
                String(item.title || '').toLocaleLowerCase('pt-BR').includes(text) ||
                String(item.genre || '').toLocaleLowerCase('pt-BR').includes(text)
            ) && (genres.value === 'todos' || item.genre === genres.value));
            byId('free-grid').innerHTML = filtered.length ? filtered.slice(0, 45).map(item => apiCard({
                title: item.title, subtitle: `${item.genre || 'Jogo gratuito'} · ${item.platform || 'PC'}`,
                picture: item.thumbnail, badge: 'Gratuito', link: item.game_url,
                button: 'Conhecer o jogo', price: 'Grátis para jogar'
            })).join('') : emptyState('Nenhum jogo grátis encontrado com esse filtro.', false);
        };
        button.addEventListener('click', async () => {
            button.disabled = true;
            status.textContent = 'Consultando jogos gratuitos...';
            try {
                const data = await fetchJSON('https://www.freetogame.com/api/games');
                if (!Array.isArray(data)) throw new Error('Resposta inesperada');
                games = data;
                const allGenres = [...new Set(games.map(item => item.genre).filter(Boolean))].sort();
                genres.innerHTML = '<option value="todos">Todos os gêneros</option>' + allGenres.map(genre => `<option value="${escapeHTML(genre)}">${escapeHTML(genre)}</option>`).join('');
                status.textContent = `${games.length} jogos encontrados.`;
                draw();
            } catch {
                status.innerHTML = 'Não foi possível carregar os jogos agora. Tente novamente.';
            } finally {
                button.disabled = false;
            }
        });
        search.addEventListener('input', () => {if (games.length) draw();});
        genres.addEventListener('change', () => {if (games.length) draw();});
        button.click();
    }

    function setupGiveaways() {
        let deals = [];
        const button = byId('load-giveaways');
        const search = byId('giveaways-search');
        const type = byId('giveaways-type');
        const status = byId('giveaways-status');
        const draw = () => {
            const text = search.value.trim().toLocaleLowerCase('pt-BR');
            const filtered = deals.filter(item => (
                String(item.title || '').toLocaleLowerCase('pt-BR').includes(text) ||
                String(item.platforms || '').toLocaleLowerCase('pt-BR').includes(text)
            ) && (type.value === 'todos' || String(item.type || '').toLowerCase() === type.value.toLowerCase()));
            byId('giveaways-grid').innerHTML = filtered.length ? filtered.slice(0, 48).map(item => apiCard({
                title: item.title, subtitle: `${item.platforms || 'Várias plataformas'} · ${item.end_date || 'Prazo não informado'}`,
                picture: item.thumbnail || item.image, badge: item.type || 'Brinde',
                link: item.open_giveaway_url || item.gamerpower_url,
                button: 'Conferir oferta', price: item.worth && item.worth !== 'N/A' ? `Valor habitual: ${item.worth}` : 'Oferta gratuita'
            })).join('') : emptyState('Nenhuma oferta encontrada com esses filtros.', false);
        };
        button.addEventListener('click', async () => {
            button.disabled = true;
            status.textContent = 'Consultando ofertas gratuitas...';
            try {
                const data = await fetchJSON('https://www.gamerpower.com/api/giveaways');
                if (!Array.isArray(data)) {
                    if (data && data.status === 201) {
                        deals = [];
                        status.textContent = 'Nenhuma oferta gratuita disponível neste momento.';
                        draw();
                        return;
                    }
                    throw new Error('Resposta inesperada');
                }
                deals = data;
                status.textContent = `${deals.length} ofertas disponíveis. Confirme as condições na página de cada oferta.`;
                draw();
            } catch {
                status.innerHTML = 'Não foi possível consultar os brindes neste momento. Tente novamente ou visite a <a href="https://www.gamerpower.com/" target="_blank" rel="noopener noreferrer">GamerPower</a>.';
            } finally {
                button.disabled = false;
            }
        });
        search.addEventListener('input', () => {if (deals.length) draw();});
        type.addEventListener('change', () => {if (deals.length) draw();});
        button.click();
    }

    setupMenu();
    setupGameActions();
    const pages = {
        index: setupHome,
        biblioteca: setupLibrary,
        adicionar: setupAdd,
        jogando: setupPlaying,
        zerados: setupFinished,
        backlog: setupBacklog,
        desejos: setupWishes,
        avaliacoes: setupRatings,
        favoritos: setupFavorites,
        generos: setupGenres,
        plataformas: setupPlatforms,
        estatisticas: setupStatistics,
        promocoes: setupDeals,
        gratis: setupFreeGames,
        brindes: setupGiveaways
    };
    if (pages[page]) pages[page]();
})();
