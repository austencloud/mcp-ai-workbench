/**
 * 2025-Ready UI Enhancement Script
 * Applies modern glass morphism, lighting effects, and micro-interactions
 */

export function enhanceUI() {
  // Add enhanced CSS variables to the document
  const style = document.createElement('style');
  style.textContent = `
    /* 2025-Ready Enhanced Variables */
    :root {
      --glass-bg-primary: rgba(255, 255, 255, 0.08);
      --glass-bg-secondary: rgba(255, 255, 255, 0.12);
      --glass-bg-tertiary: rgba(255, 255, 255, 0.15);
      --glass-border-primary: rgba(255, 255, 255, 0.12);
      --glass-border-secondary: rgba(255, 255, 255, 0.18);
      --glass-border-accent: rgba(255, 255, 255, 0.25);
      
      --depth-1: 0 1px 2px rgba(0, 0, 0, 0.07);
      --depth-2: 0 4px 12px rgba(0, 0, 0, 0.15);
      --depth-3: 0 12px 32px rgba(0, 0, 0, 0.25);
      --depth-4: 0 24px 64px rgba(0, 0, 0, 0.35);
      --depth-5: 0 40px 96px rgba(0, 0, 0, 0.45);
      
      --neon-glow-subtle: 0 0 15px;
      --neon-glow-medium: 0 0 25px;
      --neon-glow-strong: 0 0 40px;
      
      --light-x: 50%;
      --light-y: 30%;
      --light-color: #00d4ff;
      --neon-intensity: 0.8;
      
      --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
      --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
      
      --text-primary: rgba(255, 255, 255, 0.95);
      --text-secondary: rgba(255, 255, 255, 0.8);
      --text-tertiary: rgba(255, 255, 255, 0.65);
      --text-muted: rgba(255, 255, 255, 0.5);
      --focus-ring: 0 0 0 3px rgba(59, 130, 246, 0.5);
    }

    /* Enhanced Glass Morphism */
    .glass {
      backdrop-filter: blur(20px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
      background: var(--glass-bg-primary) !important;
      border: 1px solid var(--glass-border-primary) !important;
      border-radius: 24px !important;
      box-shadow: var(--depth-3), inset 0 1px 1px rgba(255, 255, 255, 0.1) !important;
      transition: all 0.4s var(--ease-smooth) !important;
      transform: translateZ(0);
    }

    .glass:hover {
      background: var(--glass-bg-secondary) !important;
      border-color: var(--glass-border-secondary) !important;
      box-shadow: var(--depth-4), inset 0 1px 1px rgba(255, 255, 255, 0.15) !important;
      transform: translateY(-2px) translateZ(0) !important;
    }

    /* Enhanced Buttons */
    .btn-futuristic {
      backdrop-filter: blur(16px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
      background: var(--glass-bg-primary) !important;
      border: 1px solid var(--glass-border-primary) !important;
      border-radius: 16px !important;
      padding: 0.875rem 1.75rem !important;
      color: var(--text-primary) !important;
      font-weight: 600 !important;
      font-size: 0.875rem !important;
      letter-spacing: 0.025em !important;
      transition: all 0.3s var(--ease-smooth) !important;
      position: relative;
      overflow: hidden;
      transform: translateZ(0);
    }

    .btn-futuristic::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      transition: left 0.6s var(--ease-smooth);
    }

    .btn-futuristic:hover {
      background: var(--glass-bg-secondary) !important;
      border-color: var(--glass-border-secondary) !important;
      transform: translateY(-2px) translateZ(0) !important;
      box-shadow: var(--depth-3), var(--neon-glow-subtle) var(--light-color) !important;
    }

    .btn-futuristic:hover::before {
      left: 100%;
    }

    .btn-futuristic:focus-visible {
      outline: none !important;
      box-shadow: var(--focus-ring), var(--depth-2) !important;
    }

    /* Enhanced Primary Button */
    .btn-primary-futuristic {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%) !important;
      border-color: rgba(59, 130, 246, 0.6) !important;
    }

    .btn-primary-futuristic:hover {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.35) 0%, rgba(139, 92, 246, 0.35) 100%) !important;
      border-color: rgba(59, 130, 246, 0.8) !important;
      box-shadow: var(--depth-4), var(--neon-glow-medium) rgba(59, 130, 246, 0.4) !important;
    }

    /* Enhanced Sidebar */
    .sidebar-futuristic {
      backdrop-filter: blur(24px) saturate(200%) !important;
      -webkit-backdrop-filter: blur(24px) saturate(200%) !important;
      background: linear-gradient(135deg, var(--glass-bg-secondary) 0%, var(--glass-bg-primary) 100%) !important;
      border-right: 1px solid var(--glass-border-secondary) !important;
      transform: translateZ(40px);
      box-shadow: var(--depth-4) !important;
    }

    /* Enhanced Chat Bubbles */
    .chat-bubble-futuristic {
      backdrop-filter: blur(20px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
      background: var(--glass-bg-secondary) !important;
      border: 1px solid var(--glass-border-secondary) !important;
      border-radius: 20px !important;
      padding: 1.25rem !important;
      transition: all 0.3s var(--ease-smooth) !important;
    }

    .chat-bubble-user {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%) !important;
      border-color: rgba(59, 130, 246, 0.4) !important;
    }

    .chat-bubble-assistant {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(244, 114, 182, 0.25) 100%) !important;
      border-color: rgba(139, 92, 246, 0.4) !important;
    }

    /* Adaptive Lighting */
    body::after {
      content: "";
      position: fixed;
      top: 0;
      left: 0;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at var(--light-x) var(--light-y), var(--light-color) 0%, transparent 70%);
      opacity: calc(var(--neon-intensity) * 0.15);
      z-index: -1;
      pointer-events: none;
      transition: all 1.2s var(--ease-smooth);
      mix-blend-mode: screen;
    }

    /* Micro-interactions */
    .micro-lift {
      transition: all 0.3s var(--ease-smooth);
    }

    .micro-lift:hover {
      transform: translateY(-4px);
      box-shadow: var(--depth-4);
    }

    /* Enhanced scrollbars */
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
      background: var(--glass-bg-primary);
      border-radius: 4px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--glass-border-secondary);
      border-radius: 4px;
      transition: background 0.3s var(--ease-smooth);
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: var(--glass-border-accent);
    }
  `;
  
  document.head.appendChild(style);
  
  // Add mouse tracking for adaptive lighting
  setupMouseTracking();
  
  // Add provider color mapping
  setupProviderLighting();
  
  // Add micro-interactions
  setupMicroInteractions();
}

function setupMouseTracking() {
  let ticking = false;
  
  const updateLighting = (e) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        
        document.documentElement.style.setProperty('--light-x', `${x}%`);
        document.documentElement.style.setProperty('--light-y', `${y}%`);
        
        ticking = false;
      });
      ticking = true;
    }
  };

  document.addEventListener('mousemove', updateLighting, { passive: true });
}

function setupProviderLighting() {
  const providerColors = {
    openai: '#00d4ff',
    anthropic: '#8b5cf6',
    google: '#4ade80',
    deepseek: '#f472b6',
    ollama: '#fb923c'
  };

  // Listen for AI provider changes
  window.addEventListener('aiProviderChanged', (event) => {
    const provider = event.detail?.provider || 'openai';
    const color = providerColors[provider] || providerColors.openai;
    
    document.documentElement.style.setProperty('--light-color', color);
  });
}

function setupMicroInteractions() {
  // Add micro-lift class to interactive elements
  const interactiveElements = document.querySelectorAll('.glass, .btn-futuristic, .chat-bubble-futuristic');
  interactiveElements.forEach(el => {
    el.classList.add('micro-lift');
  });
  
  // Observe for new elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          const newInteractiveElements = node.querySelectorAll?.('.glass, .btn-futuristic, .chat-bubble-futuristic') || [];
          newInteractiveElements.forEach(el => {
            el.classList.add('micro-lift');
          });
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceUI);
  } else {
    enhanceUI();
  }
}
