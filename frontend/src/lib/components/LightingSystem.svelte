<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { lighting } from '$lib/utils/lighting.js';
  
  export let provider = 'openai';
  export let intensity = 0.8;
  export let enableParticles = true;
  
  let mounted = false;
  let particleContainer: HTMLElement;
  
  onMount(() => {
    mounted = true;
    
    // Initialize lighting system
    lighting.init();
    lighting.setProvider(provider);
    lighting.setIntensity(intensity);
    
    // Create floating particles if enabled
    if (enableParticles && particleContainer) {
      createParticleEffect();
    }
    
    // Listen for provider changes
    window.addEventListener('providerChanged', handleProviderChange as EventListener);
    
    // Add CSS for animations
    const animationStyles = document.createElement('link');
    animationStyles.rel = 'stylesheet';
    animationStyles.href = '/src/lib/styles/animations.css';
    document.head.appendChild(animationStyles);
  });
  
  onDestroy(() => {
    window.removeEventListener('providerChanged', handleProviderChange as EventListener);
  });
  
  function handleProviderChange(event: Event) {
    const customEvent = event as CustomEvent<{ provider: string; color: string }>;
    const { provider: newProvider, color } = customEvent.detail;
    
    // Update particle colors if they exist
    const particles = document.querySelectorAll('.floating-particle');
    particles.forEach(particle => {
      (particle as HTMLElement).style.background = color;
    });
  }
  
  function createParticleEffect() {
    if (!particleContainer) return;
    
    // Create initial particles
    lighting.createParticles(particleContainer, 15);
    
    // Create new particles periodically
    const particleInterval = setInterval(() => {
      if (mounted && particleContainer) {
        lighting.createParticles(particleContainer, 3);
      } else {
        clearInterval(particleInterval);
      }
    }, 3000);
  }
  
  // Reactive updates
  $: if (mounted && lighting) {
    lighting.setProvider(provider);
  }
  
  $: if (mounted && lighting) {
    lighting.setIntensity(intensity);
  }
</script>

<!-- Particle Container -->
{#if enableParticles}
  <div 
    bind:this={particleContainer}
    class="particle-container"
    aria-hidden="true"
  ></div>
{/if}

<!-- Enhanced CSS Variables and Styles -->
<svelte:head>
  <style>
    /* Additional 2025-ready enhancements */
    .particle-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    }
    
    /* Enhanced button styles with new variables */
    .btn-futuristic {
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      background: var(--glass-bg-primary);
      border: 1px solid var(--glass-border-primary);
      border-radius: 16px;
      padding: 0.875rem 1.75rem;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.875rem;
      letter-spacing: 0.025em;
      transition: all 0.3s var(--ease-smooth);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      text-decoration: none;
      position: relative;
      overflow: hidden;
      transform: translateZ(0);
      user-select: none;
    }
    
    .btn-futuristic::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.1),
        transparent
      );
      transition: left 0.6s var(--ease-smooth);
    }
    
    .btn-futuristic:hover {
      background: var(--glass-bg-secondary);
      border-color: var(--glass-border-secondary);
      transform: translateY(-2px) translateZ(0);
      box-shadow: var(--depth-3), var(--neon-glow-subtle) var(--light-color);
    }
    
    .btn-futuristic:hover::before {
      left: 100%;
    }
    
    .btn-futuristic:active {
      transform: translateY(0) scale(0.98) translateZ(0);
      transition: all 0.1s var(--ease-smooth);
    }
    
    .btn-futuristic:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring), var(--depth-2);
    }
    
    /* Primary button variant */
    .btn-primary-futuristic {
      background: linear-gradient(
        135deg,
        rgba(59, 130, 246, 0.25) 0%,
        rgba(139, 92, 246, 0.25) 100%
      );
      border-color: rgba(59, 130, 246, 0.6);
    }
    
    .btn-primary-futuristic:hover {
      background: linear-gradient(
        135deg,
        rgba(59, 130, 246, 0.35) 0%,
        rgba(139, 92, 246, 0.35) 100%
      );
      border-color: rgba(59, 130, 246, 0.8);
      box-shadow: var(--depth-4), var(--neon-glow-medium) rgba(59, 130, 246, 0.4);
    }
    
    /* Enhanced input styles */
    .input-futuristic {
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      background: var(--glass-bg-primary);
      border: 1px solid var(--glass-border-primary);
      border-radius: 16px;
      padding: 0.875rem 1rem;
      color: var(--text-primary);
      font-size: 0.875rem;
      transition: all 0.3s var(--ease-smooth);
      width: 100%;
    }
    
    .input-futuristic::placeholder {
      color: var(--text-muted);
    }
    
    .input-futuristic:focus {
      outline: none;
      border-color: var(--light-color);
      background: var(--glass-bg-secondary);
      box-shadow: var(--focus-ring), var(--depth-2);
    }
    
    /* Enhanced sidebar */
    .sidebar-futuristic {
      backdrop-filter: blur(24px) saturate(200%);
      -webkit-backdrop-filter: blur(24px) saturate(200%);
      background: linear-gradient(
        135deg,
        var(--glass-bg-secondary) 0%,
        var(--glass-bg-primary) 100%
      );
      border-right: 1px solid var(--glass-border-secondary);
      overflow-y: auto;
      z-index: 25;
      transform: translateZ(40px);
      box-shadow: var(--depth-4);
    }
    
    /* Enhanced chat bubbles */
    .chat-bubble-futuristic {
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      background: var(--glass-bg-secondary);
      border: 1px solid var(--glass-border-secondary);
      border-radius: 20px;
      padding: 1.25rem;
      max-width: none;
      transition: all 0.3s var(--ease-smooth);
    }
    
    .chat-bubble-user {
      background: linear-gradient(
        135deg,
        rgba(59, 130, 246, 0.25) 0%,
        rgba(139, 92, 246, 0.25) 100%
      );
      border-color: rgba(59, 130, 246, 0.4);
    }
    
    .chat-bubble-assistant {
      background: linear-gradient(
        135deg,
        rgba(139, 92, 246, 0.25) 0%,
        rgba(244, 114, 182, 0.25) 100%
      );
      border-color: rgba(139, 92, 246, 0.4);
      position: relative;
      overflow: hidden;
    }
    
    /* Chat container with 3D depth */
    .chat-container {
      transform: translateZ(20px);
      z-index: 10;
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
  </style>
</svelte:head>
