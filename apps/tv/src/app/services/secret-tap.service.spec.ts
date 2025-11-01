import { SecretTapService } from './secret-tap.service';

describe('SecretTapService', () => {
  let svc: SecretTapService;
  let host: HTMLElement;

  beforeEach(() => {
    svc = new SecretTapService();
    host = document.createElement('div');
    document.body.appendChild(host);
    svc.attach(host);
  });

  afterEach(() => {
    svc.detach(host);
    document.body.removeChild(host);
  });

  function dispatchPointerDown() {
    const ev = new PointerEvent('pointerdown', { bubbles: true });
    host.dispatchEvent(ev);
  }

  it('emits on 3–pause–3 pattern and respects cooldown', (done) => {
    let emits = 0;
    svc.triggered$.subscribe(() => {
      emits++;
    });

    // Simulate tapping timeline using performance.now() mocking
    const times = [
      0, 100, 200, // first burst (3 taps within intraTapMaxMs)
      650, // inter-burst gap (valid: between 300 and 1200ms)
      700, 800, 900, // second burst (3 taps)
      1200, 1300, 1400, // attempt an immediate second trigger within cooldown (should NOT emit)
    ];
    let idx = 0;
    spyOn(performance, 'now').and.callFake(() => times[Math.min(idx, times.length - 1)]);

    // First burst
    dispatchPointerDown(); idx++;
    dispatchPointerDown(); idx++;
    dispatchPointerDown(); idx++;

    // Gap
    dispatchPointerDown(); idx++;

    // Second burst
    dispatchPointerDown(); idx++;
    dispatchPointerDown(); idx++;
    dispatchPointerDown(); idx++;

    // Attempt another full pattern immediately (still in cooldown window)
    dispatchPointerDown(); idx++;
    dispatchPointerDown(); idx++;
    dispatchPointerDown(); idx++;

    // Allow microtask queue to flush
    setTimeout(() => {
      expect(emits).toBe(1);
      done();
    });
  });
});
