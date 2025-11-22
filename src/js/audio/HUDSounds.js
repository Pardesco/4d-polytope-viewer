export class HUDSounds {
  constructor() {
    this.enabled = localStorage.getItem('hud-sounds') !== 'false';
    this.sounds = {};
    this.loadSounds();
  }
  
  loadSounds() {
    // Using Web Audio API to generate synthetic sounds
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  // Generate tick sound (hover)
  playTick() {
    if (!this.enabled) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.05);
  }
  
  // Generate chirp sound (click)
  playChirp() {
    if (!this.enabled) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }
  
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('hud-sounds', this.enabled);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('hud-sounds', this.enabled);
  }
}