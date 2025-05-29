/**
 * 2025-Ready Interactive Lighting System
 * Provides adaptive lighting that responds to user interactions and AI provider changes
 */

export class InteractiveLighting {
  constructor() {
    this.isInitialized = false;
    this.currentProvider = 'openai';
    this.lightingIntensity = 0.8;
    
    // Provider color mappings
    this.providerColors = {
      openai: '#00d4ff',
      anthropic: '#8b5cf6', 
      google: '#4ade80',
      deepseek: '#f472b6',
      ollama: '#fb923c'
    };
    
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    // Set up mouse tracking for adaptive lighting
    this.setupMouseTracking();
    
    // Set up intersection observer for element highlighting
    this.setupIntersectionObserver();
    
    // Initialize with default provider
    this.setProvider(this.currentProvider);
    
    this.isInitialized = true;
  }

  setupMouseTracking() {
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
    
    // Add touch support for mobile
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updateLighting({
          clientX: touch.clientX,
          clientY: touch.clientY
        });
      }
    }, { passive: true });
  }

  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        } else {
          entry.target.classList.remove('in-view');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });

    // Observe glass elements
    const observeElements = () => {
      const glassElements = document.querySelectorAll('.glass, .glass-strong, .glass-readable, .glass-volumetric');
      glassElements.forEach(el => observer.observe(el));
    };

    // Initial observation
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observeElements);
    } else {
      observeElements();
    }

    // Re-observe when new elements are added
    const mutationObserver = new MutationObserver(() => {
      observeElements();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setProvider(provider) {
    if (!this.providerColors[provider]) {
      console.warn(`Unknown provider: ${provider}`);
      return;
    }

    this.currentProvider = provider;
    const color = this.providerColors[provider];
    
    document.documentElement.style.setProperty('--light-color', color);
    
    // Add smooth transition class
    document.body.classList.add('provider-transition');
    
    // Remove transition class after animation
    setTimeout(() => {
      document.body.classList.remove('provider-transition');
    }, 1200);
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('providerChanged', {
      detail: { provider, color }
    }));
  }

  setIntensity(intensity) {
    this.lightingIntensity = Math.max(0, Math.min(1, intensity));
    document.documentElement.style.setProperty('--neon-intensity', this.lightingIntensity);
  }

  // Pulse effect for notifications or important events
  pulse(element, color = null, duration = 1000) {
    if (!element) return;
    
    const pulseColor = color || this.providerColors[this.currentProvider];
    
    element.style.setProperty('--pulse-color', pulseColor);
    element.classList.add('pulse-effect');
    
    setTimeout(() => {
      element.classList.remove('pulse-effect');
    }, duration);
  }

  // Highlight effect for interactive elements
  highlight(element, intensity = 'medium') {
    if (!element) return;
    
    element.classList.add(`highlight-${intensity}`);
    
    // Auto-remove highlight after interaction
    const removeHighlight = () => {
      element.classList.remove(`highlight-${intensity}`);
      element.removeEventListener('mouseleave', removeHighlight);
      element.removeEventListener('blur', removeHighlight);
    };
    
    element.addEventListener('mouseleave', removeHighlight, { once: true });
    element.addEventListener('blur', removeHighlight, { once: true });
  }

  // Create floating particles effect
  createParticles(container, count = 20) {
    if (!container) return;
    
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 4 + 1}px;
        height: ${Math.random() * 4 + 1}px;
        background: ${this.providerColors[this.currentProvider]};
        border-radius: 50%;
        opacity: ${Math.random() * 0.5 + 0.1};
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: float-particle ${Math.random() * 10 + 5}s linear infinite;
        pointer-events: none;
      `;
      
      container.appendChild(particle);
      
      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 15000);
    }
  }

  destroy() {
    // Clean up event listeners and observers
    this.isInitialized = false;
  }
}

// Export singleton instance
export const lighting = new InteractiveLighting();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  lighting.init();
}
