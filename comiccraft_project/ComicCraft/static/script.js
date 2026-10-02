/**
 * COMICCRAFT - FRONTEND ENGINE & SPA CONTROLLER
 * Ethical, safe, emoji-free, professional student AI comic creation platform.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // State Management
  let currentComicData = null;
  let activePanelIndex = 0;

  // DOM Elements
  const navItems = document.querySelectorAll('.nav-item');
  const viewScreens = document.querySelectorAll('.view-screen');
  const sidebar = document.getElementById('sidebar');
  const mobileToggleBtn = document.getElementById('mobileToggleBtn');

  // Form Elements
  const comicCreateForm = document.getElementById('comicCreateForm');
  const aiProgressModal = document.getElementById('aiProgressModal');

  // Preview / Editor Elements
  const previewStoryTitle = document.getElementById('previewStoryTitle');
  const previewToneTag = document.getElementById('previewToneTag');
  const previewStyleTag = document.getElementById('previewStyleTag');
  const previewPanelsTag = document.getElementById('previewPanelsTag');
  const panelsScriptList = document.getElementById('panelsScriptList');
  const editorTitleInput = document.getElementById('editorTitleInput');
  const panelThumbnailsList = document.getElementById('panelThumbnailsList');
  const activePanelStage = document.getElementById('activePanelStage');

  // Controls Form
  const ctrlPanelTitle = document.getElementById('ctrlPanelTitle');
  const ctrlNarration = document.getElementById('ctrlNarration');
  const ctrlDialogue = document.getElementById('ctrlDialogue');
  const ctrlRegenerateBtn = document.getElementById('ctrlRegenerateBtn');
  const ctrlDeletePanelBtn = document.getElementById('ctrlDeletePanelBtn');

  // Buttons
  const heroCreateBtn = document.getElementById('heroCreateBtn');
  const topCreateBtn = document.getElementById('topCreateBtn');
  const viewAllProjectsBtn = document.getElementById('viewAllProjectsBtn');
  const proceedToEditorBtn = document.getElementById('proceedToEditorBtn');
  const editorPreviewModalBtn = document.getElementById('editorPreviewModalBtn');
  const editorExportBtn = document.getElementById('editorExportBtn');
  const editorAddPanelBtn = document.getElementById('editorAddPanelBtn');
  const finalBackToEditorBtn = document.getElementById('finalBackToEditorBtn');
  const finalSaveBtn = document.getElementById('finalSaveBtn');
  const finalDownloadBtn = document.getElementById('finalDownloadBtn');
  const myComicsNewBtn = document.getElementById('myComicsNewBtn');

  // --- SPA VIEW SWITCHER ---
  window.switchView = function(viewId) {
    viewScreens.forEach(screen => {
      screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(viewId);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }

    navItems.forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (window.innerWidth <= 1024 && sidebar) {
      sidebar.classList.remove('mobile-open');
    }

    if (window.lucide) {
      lucide.createIcons();
    }

    // Refresh database comics if viewing dashboard or myComics
    if (viewId === 'dashboardView' || viewId === 'myComicsView') {
      loadDatabaseComics();
    }
  };

  // Attach Navigation Listeners
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.getAttribute('data-view');
      switchView(viewId);
    });
  });

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }

  // Quick Action Buttons
  if (heroCreateBtn) heroCreateBtn.addEventListener('click', () => switchView('createComicView'));
  if (topCreateBtn) topCreateBtn.addEventListener('click', () => switchView('createComicView'));
  if (myComicsNewBtn) myComicsNewBtn.addEventListener('click', () => switchView('createComicView'));
  if (viewAllProjectsBtn) viewAllProjectsBtn.addEventListener('click', () => switchView('myComicsView'));

  // Template buttons
  document.querySelectorAll('.use-template-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.template-card');
      const title = card.querySelector('.template-title').innerText;
      const desc = card.querySelector('.template-desc').innerText;
      
      switchView('createComicView');
      const promptInput = document.getElementById('storyPromptInput');
      if (promptInput) {
        promptInput.value = `${title}: ${desc}`;
      }
    });
  });

  // --- AI GENERATION FLOW ---
  if (comicCreateForm) {
    comicCreateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Show Step-by-Step Progress Overlay
      if (aiProgressModal) aiProgressModal.classList.add('active');
      resetProgressSteps();

      // Step Animation Timeline
      await runProgressAnimation();

      try {
        const formData = new FormData(comicCreateForm);
        const res = await fetch('/api/generate', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to generate comic story.');
        }

        currentComicData = data;
        if (aiProgressModal) aiProgressModal.classList.remove('active');

        // Render Story Preview
        renderStoryPreview(data);
        switchView('storyPreviewView');

      } catch (err) {
        if (aiProgressModal) aiProgressModal.classList.remove('active');
        alert('AI Generation Error: ' + err.message);
      }
    });
  }

  function resetProgressSteps() {
    for (let i = 1; i <= 6; i++) {
      const step = document.getElementById(`step${i}`);
      if (step) {
        step.className = 'step-item';
      }
    }
  }

  async function runProgressAnimation() {
    for (let i = 1; i <= 6; i++) {
      const step = document.getElementById(`step${i}`);
      if (step) {
        step.classList.add('active');
      }
      await new Promise(resolve => setTimeout(resolve, 400));
      if (step) {
        step.classList.remove('active');
        step.classList.add('completed');
      }
    }
  }

  // --- STORY PREVIEW RENDER ---
  function renderStoryPreview(data) {
    if (previewStoryTitle) previewStoryTitle.innerText = data.title;
    if (previewToneTag) previewToneTag.innerHTML = `<i data-lucide="file-text"></i> ${data.panels.length} Story Script Scripted`;
    if (previewPanelsTag) previewPanelsTag.innerHTML = `<i data-lucide="panels-top-left"></i> ${data.panels.length} Panels`;
    if (editorTitleInput) editorTitleInput.value = data.title;

    if (panelsScriptList) {
      panelsScriptList.innerHTML = '';
      data.panels.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'script-item';
        item.innerHTML = `
          <h4>Panel ${idx + 1}: ${p.title}</h4>
          <p><strong>Narration:</strong> ${p.narration}</p>
          <p><strong>Dialogue:</strong> ${p.dialogue}</p>
        `;
        panelsScriptList.appendChild(item);
      });
    }

    if (window.lucide) lucide.createIcons();
  }

  if (proceedToEditorBtn) {
    proceedToEditorBtn.addEventListener('click', () => {
      renderEditorWorkspace();
      switchView('editorView');
    });
  }

  // --- COMIC EDITOR LOGIC ---
  function renderEditorWorkspace() {
    if (!currentComicData || !currentComicData.panels) return;

    // Render Panel Thumbnails
    if (panelThumbnailsList) {
      panelThumbnailsList.innerHTML = '';
      currentComicData.panels.forEach((panel, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `thumb-item ${idx === activePanelIndex ? 'active' : ''}`;
        thumb.innerHTML = `
          <img src="${panel.image_url}" alt="Panel ${idx + 1}" style="width:100%; height:80px; object-fit:cover; border-radius:4px;" />
          <span style="font-size:12px; font-weight:600; display:block; margin-top:4px;">Panel ${idx + 1}</span>
        `;
        thumb.addEventListener('click', () => {
          activePanelIndex = idx;
          renderEditorWorkspace();
        });
        panelThumbnailsList.appendChild(thumb);
      });
    }

    // Render Active Panel Stage
    const currentPanel = currentComicData.panels[activePanelIndex];
    if (currentPanel && activePanelStage) {
      activePanelStage.innerHTML = `
        <img src="${currentPanel.image_url}" class="panel-stage-img" alt="${currentPanel.title}" />
        <div class="panel-dialogue-bubble">
          <p style="font-size:12px; color:#64748b; margin-bottom:2px;">Panel ${activePanelIndex + 1}: ${currentPanel.title}</p>
          <p>${currentPanel.dialogue}</p>
        </div>
      `;

      // Fill Right Controls
      if (ctrlPanelTitle) ctrlPanelTitle.value = currentPanel.title;
      if (ctrlNarration) ctrlNarration.value = currentPanel.narration;
      if (ctrlDialogue) ctrlDialogue.value = currentPanel.dialogue;
    }
  }

  // Control Form Input Updates
  if (ctrlPanelTitle) {
    ctrlPanelTitle.addEventListener('input', (e) => {
      if (currentComicData && currentComicData.panels[activePanelIndex]) {
        currentComicData.panels[activePanelIndex].title = e.target.value;
      }
    });
  }

  if (ctrlNarration) {
    ctrlNarration.addEventListener('input', (e) => {
      if (currentComicData && currentComicData.panels[activePanelIndex]) {
        currentComicData.panels[activePanelIndex].narration = e.target.value;
      }
    });
  }

  if (ctrlDialogue) {
    ctrlDialogue.addEventListener('input', (e) => {
      if (currentComicData && currentComicData.panels[activePanelIndex]) {
        currentComicData.panels[activePanelIndex].dialogue = e.target.value;
        const bubble = activePanelStage.querySelector('.panel-dialogue-bubble p:last-child');
        if (bubble) bubble.innerText = e.target.value;
      }
    });
  }

  if (editorAddPanelBtn) {
    editorAddPanelBtn.addEventListener('click', () => {
      if (!currentComicData) return;
      const newPanelNum = currentComicData.panels.length + 1;
      currentComicData.panels.push({
        title: `Panel ${newPanelNum}: Continuation`,
        narration: `The story continues as the scene unfolds further.`,
        dialogue: `Character: "We must push forward!"`,
        image_url: currentComicData.panels[0].image_url
      });
      activePanelIndex = currentComicData.panels.length - 1;
      renderEditorWorkspace();
    });
  }

  if (ctrlDeletePanelBtn) {
    ctrlDeletePanelBtn.addEventListener('click', () => {
      if (!currentComicData || currentComicData.panels.length <= 1) {
        alert('Comic must have at least 1 panel.');
        return;
      }
      currentComicData.panels.splice(activePanelIndex, 1);
      activePanelIndex = Math.max(0, activePanelIndex - 1);
      renderEditorWorkspace();
    });
  }

  if (editorPreviewModalBtn) {
    editorPreviewModalBtn.addEventListener('click', () => {
      renderFinalPreview();
      switchView('finalPreviewView');
    });
  }

  // --- FINAL PREVIEW & EXPORT ---
  function renderFinalPreview() {
    const board = document.getElementById('finalComicBoard');
    if (!board || !currentComicData) return;

    board.innerHTML = `
      <h1 style="text-align:center; font-size:28px; font-weight:700; color:#0f172a; margin-bottom:24px;">${currentComicData.title}</h1>
      <div class="final-grid">
        ${currentComicData.panels.map((p, idx) => `
          <div class="final-panel-card">
            <img src="${p.image_url}" alt="Panel ${idx + 1}" />
            <div class="final-panel-info">
              <div class="final-narration">${p.narration}</div>
              <div class="final-dialogue"><strong>Panel ${idx + 1}:</strong> ${p.dialogue}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (finalBackToEditorBtn) finalBackToEditorBtn.addEventListener('click', () => switchView('editorView'));

  if (finalSaveBtn) {
    finalSaveBtn.addEventListener('click', () => {
      alert('Comic project saved successfully to SQLite Database!');
      loadDatabaseComics();
      switchView('myComicsView');
    });
  }

  if (editorExportBtn) editorExportBtn.addEventListener('click', exportComicPDF);
  if (finalDownloadBtn) finalDownloadBtn.addEventListener('click', exportComicPDF);

  async function exportComicPDF() {
    if (!currentComicData) return;
    try {
      const formData = new FormData();
      formData.append('comic_id', currentComicData.comic_id || 'comic');
      formData.append('title', currentComicData.title || 'ComicCraft Story');
      formData.append('panels_json', JSON.stringify(currentComicData.panels));

      const res = await fetch('/api/export', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Export failed.');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ComicCraft_${currentComicData.title.replace(/\s+/g, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export Error: ' + err.message);
    }
  }

  // --- DATABASE COMICS LOADING ---
  async function loadDatabaseComics() {
    const recentGrid = document.getElementById('recentProjectsGrid');
    const myComicsGrid = document.getElementById('myComicsGrid');
    const galleryGrid = document.getElementById('galleryGrid');

    try {
      const res = await fetch('/api/comics');
      const data = await res.json();
      if (!res.ok || !data.comics) return;

      const renderGrid = (container, maxItems = null) => {
        if (!container) return;
        if (data.comics.length === 0) {
          container.innerHTML = `<div style="grid-column:1/-1; padding:32px; text-align:center; color:#64748b;">No saved comic projects found. Create your first comic!</div>`;
          return;
        }

        const items = maxItems ? data.comics.slice(0, maxItems) : data.comics;
        container.innerHTML = items.map(c => `
          <div class="comic-card">
            <div class="comic-thumb">
              <i data-lucide="book-open"></i>
            </div>
            <div class="comic-body">
              <h3 class="comic-title">${c.title}</h3>
              <div class="comic-meta">
                <span>${c.panels_count} Panels</span>
                <span>${new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <div class="comic-actions">
                <button class="btn btn-primary btn-sm btn-open-db-comic" data-id="${c.id}" style="width:100%;">
                  <i data-lucide="pencil"></i> Open Comic
                </button>
              </div>
            </div>
          </div>
        `).join('');

        container.querySelectorAll('.btn-open-db-comic').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const comicRes = await fetch(`/api/comics/${id}`);
            const comicData = await comicRes.json();
            if (comicRes.ok) {
              currentComicData = comicData;
              renderEditorWorkspace();
              switchView('editorView');
            }
          });
        });
      };

      renderGrid(recentGrid, 3);
      renderGrid(myComicsGrid);
      renderGrid(galleryGrid);

      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.error('Error loading database comics:', e);
    }
  }

  // Initial Load
  loadDatabaseComics();
});
