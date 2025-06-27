export default async function decorate(block) {
  const config = Object.fromEntries(
    [...block.querySelectorAll(':scope > div')].map(row => [
      row.children[0]?.textContent.trim(),
      row.children[1]?.textContent.trim()
    ])
  );

  block.innerHTML = `
    <div class="search-container">
      <div class="search-input-wrapper">
        <input type="text" class="search-input" placeholder="${config.placeholder || 'Search...'}" autocomplete="off" style="padding-right: 36px;" />
        <button type="button" class="search-btn" aria-label="Search">
          <svg viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="7"/>
            <line x1="14.5" y1="14.5" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <ul class="suggestions" hidden></ul>
      <div class="search-results"></div>
      <div class="pagination"></div>
      <div class="loading-spinner" hidden>Loading...</div>
    </div>
  `;

  const input = block.querySelector('.search-input');
  const searchBtn = block.querySelector('.search-btn');
  const suggestionsList = block.querySelector('.suggestions');
  const resultsContainer = block.querySelector('.search-results');
  const paginationContainer = block.querySelector('.pagination');
  const loading = block.querySelector('.loading-spinner');

  const apiBase = 'https://eds-search-utility.vercel.app/api';
  const repo = config.repo;
  const path = config.path;
  const sheet = config.sheet;
  const limit = config.limit || 10;

  let suggestions = [];
  let selectedIndex = -1;
  let debounceTimeout;
  let currentTerm = '';

  input.addEventListener('input', async (e) => {
    const q = e.target.value.trim();
    if (!q) {
      suggestionsList.innerHTML = '';
      suggestionsList.hidden = true;
      return;
    }

    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      loading.hidden = false;
      const url = `${apiBase}/suggest?repo=${repo}&path=${path}&q=${encodeURIComponent(q)}${sheet ? `&sheet=${sheet}` : ''}`;
      const res = await fetch(url, { headers: { 'x-api-key': '8f3a9b1c2d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0' }});
      const data = await res.json();
      loading.hidden = true;

      suggestions = data.suggestions;
      selectedIndex = -1;
      renderSuggestions();
    }, 250);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      selectedIndex = (selectedIndex + 1) % suggestions.length;
      updateActiveSuggestion();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
      updateActiveSuggestion();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0) {
        runSearch(suggestions[selectedIndex].title, 1);
      } else {
        runSearch(input.value, 1);
      }
      suggestionsList.hidden = true;
    } else if (e.key === 'Escape') {
      suggestionsList.hidden = true;
    }
  });

  searchBtn.addEventListener('click', () => {
    if (input.value.trim()) {
      runSearch(input.value.trim(), 1);
      suggestionsList.hidden = true;
    }
    input.focus();
  });

  function renderSuggestions() {
    suggestionsList.innerHTML = '';
    suggestionsList.hidden = suggestions.length === 0;
    suggestions.forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = highlightSuggestion(s);
      li.classList.toggle('active', i === selectedIndex);
      li.addEventListener('click', () => runSearch(s.title, 1));
      suggestionsList.appendChild(li);
    });
  }

  function updateActiveSuggestion() {
    const items = suggestionsList.querySelectorAll('li');
    items.forEach((li, i) => li.classList.toggle('active', i === selectedIndex));
  }

  async function runSearch(term, page = 1) {
    currentTerm = term;
    loading.hidden = false;
    const url = `${apiBase}/search?repo=${repo}&path=${path}&search_term=${encodeURIComponent(term)}${sheet ? `&sheet=${sheet}` : ''}&limit=${limit}&page=${page}`;
    const res = await fetch(url, { headers: { 'x-api-key': '8f3a9b1c2d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0' }});
    const data = await res.json();
    loading.hidden = true;
    resultsContainer.innerHTML = renderResults(data.results);
    paginationContainer.innerHTML = renderPagination(data.total, page);
  }

  function highlightSuggestion(suggestion) {
    const title = suggestion.title || suggestion.name || 'Untitled';
    const highlights = suggestion._highlights?.title || [];
    if (!highlights.length) return title;

    let result = '';
    let last = 0;
    highlights.forEach(h => {
      result += title.substring(last, h.start);
      result += `<mark>${title.substring(h.start, h.end + 1)}</mark>`;
      last = h.end + 1;
    });
    result += title.substring(last);
    return result;
  }

  function renderResults(results = []) {
    if (!results.length) return '<p>No results found.</p>';
    return `
      <ul class="results-list">
        ${results.map(r => `
          <li>
            <a href="${r.path || '#'}">${r.title || r.name}</a>
            <p>${r.article_subtitle || ''}</p>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function renderPagination(total, currentPage) {
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) return '';

    let buttons = '';
    if (currentPage > 1) {
      buttons += `<button class="page-btn prev" data-page="${currentPage - 1}">Prev</button>`;
    }
    if (currentPage < totalPages) {
      buttons += `<button class="page-btn next" data-page="${currentPage + 1}">Next</button>`;
    }

    setTimeout(() => {
      paginationContainer.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const page = parseInt(btn.getAttribute('data-page'));
          runSearch(currentTerm, page);
        });
      });
    }, 0);

    return `<div class="pagination-controls">${buttons}</div>`;
  }
}
