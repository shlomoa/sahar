import { networkInterfaces } from 'os';

/**
 * Host IP Selection Utility
 * 
 * Integrated from validation/tests/get_host_ip/host-ip.ts
 * Provides a best-effort externally usable IP for QR codes / remote pairing.
 */

type _Family = 'IPv4' | 'IPv6';
interface _Addr { address: string; family: _Family | number; internal: boolean; cidr?: string | null }

function _isLoopback(addr: string): boolean { 
  return addr === '::1' || addr.startsWith('127.'); 
}

function _isLinkLocal(addr: string): boolean { 
  return addr.startsWith('169.254.') || addr.toLowerCase().startsWith('fe80:'); 
}

function _isPrivateIPv4(addr: string): boolean {
  return addr.startsWith('10.') || addr.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(addr);
}

function _isGlobalIPv6(addr: string): boolean {
  const lower = addr.toLowerCase();
  return !lower.startsWith('fe80:') && !(lower.startsWith('fc') || lower.startsWith('fd')) && addr.includes(':');
}

function _normalizeFamily(f: _Family | number): _Family { 
  return (f === 6 || f === 'IPv6') ? 'IPv6' : 'IPv4'; 
}

let _cachedHostIP: { ip: string; ts: number } | null = null;
const HOST_IP_CACHE_TTL_MS = 30_000; // refresh every 30s at most

/**
 * Returns the best available host IP address for external connectivity.
 * Prefers private IPv4 LAN addresses, then global IPv6, with 30s caching.
 */
export function getBestHostIP(): string {
  const now = Date.now();
  if (_cachedHostIP && (now - _cachedHostIP.ts) < HOST_IP_CACHE_TTL_MS) {
    return _cachedHostIP.ip;
  }
  const nets = networkInterfaces();
  const candidates: { iface: string; addr: _Addr; score: number }[] = [];
  for (const [ifname, infos] of Object.entries(nets)) {
    for (const info of (infos ?? []) as _Addr[]) {
      const fam = _normalizeFamily(info.family);
      const address = info.address;
      if (info.internal || _isLoopback(address) || _isLinkLocal(address)) continue;
      let score = 0;
      if (fam === 'IPv4') {
        score += 5;
        if (_isPrivateIPv4(address)) score += 5; // prefer private LAN over public/other
      } else if (fam === 'IPv6') {
        if (_isGlobalIPv6(address)) score += 3; else continue; // skip ULA / link-local
      }
      if (/^(en|eth|wlan|wifi|lan|Ethernet|Wi-?Fi)/i.test(ifname)) score += 1;
      candidates.push({ iface: ifname, addr: info, score });
    }
  }
  if (candidates.length === 0) {
    _cachedHostIP = { ip: '127.0.0.1', ts: now };
    return _cachedHostIP.ip;
  }
  candidates.sort((a, b) => b.score - a.score);
  _cachedHostIP = { ip: candidates[0].addr.address, ts: now };
  return _cachedHostIP.ip;
}
