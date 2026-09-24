function isTouchDevice() {
  return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
}

function createButton(className, label, ariaLabel) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.setAttribute('aria-label', ariaLabel);
  button.setAttribute('tabindex', '-1');
  return button;
}

function createMobileControls(options = {}) {
  const touch = isTouchDevice();
  if (!touch) {
    return {
      touch: false,
      setGameActive() {},
      destroy() {}
    };
  }

  document.body.classList.add('touch-mode');

  const root = document.createElement('div');
  root.id = 'mobile-controls';
  root.setAttribute('aria-hidden', 'false');

  const joystick = document.createElement('div');
  joystick.id = 'mobile-joystick';
  joystick.innerHTML = '<div id="mobile-joystick-ring"></div><div id="mobile-joystick-knob"></div>';
  root.appendChild(joystick);

  const actions = document.createElement('div');
  actions.id = 'mobile-actions';
  const fire = createButton('mobile-action mobile-fire', '●', 'Disparar');
  const interact = createButton('mobile-action mobile-interact', 'E', 'Interactuar o reanimar');
  const reload = createButton('mobile-action mobile-reload', 'R', 'Recargar');
  actions.append(fire, interact, reload);
  root.appendChild(actions);

  const cameraTools = document.createElement('div');
  cameraTools.id = 'mobile-camera-tools';
  const zoomIn = createButton('mobile-mini-action', '+', 'Acercar cámara');
  const zoomOut = createButton('mobile-mini-action', '−', 'Alejar cámara');
  cameraTools.append(zoomIn, zoomOut);
  root.appendChild(cameraTools);

  document.body.appendChild(root);

  const knob = root.querySelector('#mobile-joystick-knob');
  let joystickPointer = null;
  let cameraPointer = null;
  let cameraX = 0;
  let cameraY = 0;
  let fireTimer = null;
  let active = false;

  function setMove(clientX, clientY) {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = Math.max(38, rect.width * 0.34);
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > maxRadius) {
      dx = dx / distance * maxRadius;
      dy = dy / distance * maxRadius;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    options.onMove?.(dx / maxRadius, -dy / maxRadius);
  }

  function resetMove() {
    joystickPointer = null;
    knob.style.transform = 'translate(0px, 0px)';
    options.onMove?.(0, 0);
  }

  joystick.addEventListener('pointerdown', event => {
    if (!active) return;
    joystickPointer = event.pointerId;
    joystick.setPointerCapture?.(event.pointerId);
    setMove(event.clientX, event.clientY);
    event.preventDefault();
  });

  joystick.addEventListener('pointermove', event => {
    if (event.pointerId !== joystickPointer) return;
    setMove(event.clientX, event.clientY);
    event.preventDefault();
  });

  const finishJoystick = event => {
    if (event.pointerId !== joystickPointer) return;
    resetMove();
    event.preventDefault();
  };
  joystick.addEventListener('pointerup', finishJoystick);
  joystick.addEventListener('pointercancel', finishJoystick);

  function startFire(event) {
    if (!active) return;
    options.onFire?.();
    clearInterval(fireTimer);
    fireTimer = setInterval(() => options.onFire?.(), 120);
    fire.classList.add('pressed');
    event.preventDefault();
  }

  function stopFire(event) {
    clearInterval(fireTimer);
    fireTimer = null;
    fire.classList.remove('pressed');
    event?.preventDefault?.();
  }

  fire.addEventListener('pointerdown', startFire);
  fire.addEventListener('pointerup', stopFire);
  fire.addEventListener('pointercancel', stopFire);
  fire.addEventListener('pointerleave', stopFire);

  interact.addEventListener('pointerdown', event => {
    if (!active) return;
    interact.classList.add('pressed');
    options.onInteract?.(true);
    event.preventDefault();
  });
  const stopInteract = event => {
    interact.classList.remove('pressed');
    options.onInteract?.(false);
    event?.preventDefault?.();
  };
  interact.addEventListener('pointerup', stopInteract);
  interact.addEventListener('pointercancel', stopInteract);
  interact.addEventListener('pointerleave', stopInteract);

  reload.addEventListener('pointerdown', event => {
    if (!active) return;
    reload.classList.add('pressed');
    options.onReload?.();
    event.preventDefault();
  });
  reload.addEventListener('pointerup', event => {
    reload.classList.remove('pressed');
    event.preventDefault();
  });
  reload.addEventListener('pointercancel', () => reload.classList.remove('pressed'));

  zoomIn.addEventListener('pointerdown', event => {
    if (!active) return;
    options.onZoom?.(-1.8);
    event.preventDefault();
  });
  zoomOut.addEventListener('pointerdown', event => {
    if (!active) return;
    options.onZoom?.(1.8);
    event.preventDefault();
  });

  const canvas = options.cameraSurface;
  function isControlTarget(target) {
    return !!target?.closest?.('#mobile-controls');
  }

  canvas?.addEventListener('pointerdown', event => {
    if (!active || event.pointerType !== 'touch' || isControlTarget(event.target)) return;
    if (cameraPointer !== null) return;
    cameraPointer = event.pointerId;
    cameraX = event.clientX;
    cameraY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }, { passive: false });

  canvas?.addEventListener('pointermove', event => {
    if (event.pointerId !== cameraPointer) return;
    const dx = event.clientX - cameraX;
    const dy = event.clientY - cameraY;
    cameraX = event.clientX;
    cameraY = event.clientY;
    options.onLook?.(dx, dy);
    event.preventDefault();
  }, { passive: false });

  const stopCamera = event => {
    if (event.pointerId !== cameraPointer) return;
    cameraPointer = null;
    event.preventDefault();
  };
  canvas?.addEventListener('pointerup', stopCamera, { passive: false });
  canvas?.addEventListener('pointercancel', stopCamera, { passive: false });

  function setGameActive(value) {
    active = !!value;
    document.body.classList.toggle('mobile-game-active', active);
    if (!active) {
      resetMove();
      stopFire();
      stopInteract();
      cameraPointer = null;
    }
  }

  function destroy() {
    setGameActive(false);
    root.remove();
    document.body.classList.remove('touch-mode');
  }

  return { touch: true, setGameActive, destroy };
}

window.ExploradorMobileControls = { createMobileControls, isTouchDevice };
