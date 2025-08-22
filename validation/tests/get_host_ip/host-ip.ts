// host-ip.ts
import { networkInterfaces } from 'os';

type Family = 'IPv4' | 'IPv6';
interface Addr {
  address: string;
  family: Family | number;
  internal: boolean;
  cidr?: string | null;
}

function isLoopback(addr: string): boolean {
  return addr === '::1' || addr.startsWith('127.');
}
function isLinkLocal(addr: string): boolean {
  return addr.startsWith('169.254.') || addr.toLowerCase().startsWith('fe80:');
}
function isPrivateIPv4(addr: string): boolean {
  return addr.startsWith('10.') ||
         addr.startsWith('192.168.') ||
         /^172\.(1[6-9]|2\d|3[0-1])\./.test(addr);
}
function isGlobalIPv6(addr: string): boolean {
  const lower = addr.toLowerCase();
  // exclude link-local fe80::/10 and unique-local fc00::/7
  return !lower.startsWith('fe80:') && !(lower.startsWith('fc') || lower.startsWith('fd')) && addr.includes(':');
}
function normalizeFamily(f: Family | number): Family {
  return (f === 6 || f === 'IPv6') ? 'IPv6' : 'IPv4';
}

function pickBestAddress(): string | null {
  const nets = networkInterfaces();
  const candidates: { iface: string; addr: Addr; score: number }[] = [];

  for (const [ifname, infos] of Object.entries(nets)) {
    for (const info of infos ?? []) {
      const fam = normalizeFamily((info as Addr).family);
      const address = (info as Addr).address;
      const internal = (info as Addr).internal;

      if (internal || isLoopback(address) || isLinkLocal(address)) continue;

      let score = 0;
      if (fam === 'IPv4') {
        score += 5;
        if (isPrivateIPv4(address)) score += 5;
      } else if (fam === 'IPv6') {
        if (isGlobalIPv6(address)) score += 3;
        else continue; // skip unique-local etc.
      }

      // small preference for typical physical/Wi‑Fi names
      if (/^(en|eth|wlan|wifi|lan|Ethernet|Wi-?Fi)/i.test(ifname)) score += 1;

      candidates.push({ iface: ifname, addr: info as Addr, score });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].addr.address;
}

const best = pickBestAddress();
console.log(best ?? '127.0.0.1');
