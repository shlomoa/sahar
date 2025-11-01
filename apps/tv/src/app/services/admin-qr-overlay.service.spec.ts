import { fakeAsync, tick } from '@angular/core/testing';
import { AdminQrOverlayService } from './admin-qr-overlay.service';

describe('AdminQrOverlayService', () => {
  it('show should set visible, url, and auto-hide after timeout', fakeAsync(() => {
    const svc = new AdminQrOverlayService();

    expect(svc.visible()).toBeFalse();
    expect(svc.adminUrl()).toBe('');

    void svc.show(1000, 'http://host:8080/admin');

    expect(svc.visible()).toBeTrue();
    expect(svc.adminUrl()).toBe('http://host:8080/admin');
    expect(svc.secondsLeft()).toBeGreaterThanOrEqual(0);

    // Advance just under timeout
    tick(900);
    expect(svc.visible()).toBeTrue();
    // Advance past timeout
    tick(200);
    expect(svc.visible()).toBeFalse();
  }));

  it('calling show again should extend the timer', fakeAsync(() => {
    const svc = new AdminQrOverlayService();

    void svc.show(1000, 'http://host:8080/admin');
    expect(svc.visible()).toBeTrue();

    // After 800ms, extend by another 1000ms
    tick(800);
    void svc.show(1000, 'http://host:8080/admin');

    // After total 800 + 900 = 1700ms, it should still be visible due to extension
    tick(900);
    expect(svc.visible()).toBeTrue();

    // After another 200ms (total 1900ms), it should hide
    tick(200);
    expect(svc.visible()).toBeFalse();
  }));
});
