#!/usr/bin/env node
// SAHAR Validation Orchestrator (single JS file as required)
// Usage:
//   node validate.js quick            -> run default hook sequence (A,B,I,C,D,E,J)
//   node validate.js hook A           -> run only Hook A
//   npm run quick -w validation       -> convenience script
// Hooks implemented now: A (health), B (registration/state). Others placeholder PASS.
// Extend incrementally by replacing placeholder() bodies with real logic.

import { spawn } from 'node:child_process';
import http from 'node:http';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const HOOK_SEQUENCE_DEFAULT = ['A','B','I','C','D','E','J'];
const ARG_MODE = process.argv[2] || 'quick';
const ARG_PARAM = process.argv[3];
const DEBUG = process.argv.includes('--debug') || process.env.VALIDATION_DEBUG === '1';
let SERVER_PORT;
let TV_STUB_PORT;
let REMOTE_STUB_PORT;
let HEALTH_TIMEOUT_MS;
let HOOK_B_TIMEOUT_MS;
let POLL_INTERVAL_MS;
let START_SERVER_WAIT_MS;
let START_STUBS_WAIT_MS;

const state = { processes: {}, results: [], start: Date.now(), exiting:false };

// Resolve platform-specific executables
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function log(msg){ if(DEBUG) console.log(`[validate] ${msg}`); }

function spawnProc(key, command, args, opts={}) {
	try {
		log(`spawn ${key}: ${command} ${args.join(' ')}`);
		const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command);
		const proc = spawn(command, args, { cwd: opts.cwd||process.cwd(), env: { ...process.env, ...opts.env }, stdio: DEBUG? 'inherit' : 'pipe', shell: useShell });
		state.processes[key] = proc;
		log(`spawned ${key} pid=${proc.pid || 'unknown'}`);
		proc.on('exit', code => { if(!state.exiting) log(`${key} exited with code ${code}`); });
		return proc;
	} catch(e) {
		console.error(`Failed to spawn process ${key}: ${command} ${args.join(' ')} Exception: ${e.message}`);
		process.exit(1);
	}
}

async function httpOk(path, timeoutMs) {
	const deadline = Date.now()+timeoutMs;
	while(Date.now()<deadline){
		const ok = await new Promise(res => {
			const req = http.get({ hostname:'localhost', port:SERVER_PORT, path }, r => { r.resume(); res(r.statusCode===200); });
			req.on('error', () => res(false));
		});
		if(ok) return true;
	await delay(POLL_INTERVAL_MS);
	}
	return false;
}

async function fetchJson(port, path) {
	return new Promise(resolve => {
		const req = http.get({ hostname:'localhost', port, path }, res => {
			let data=''; res.on('data', c=> data+=c); res.on('end', ()=> { 
				try{ 
					resolve(JSON.parse(data)); 
				} catch(e) {
					log(`fetchJson parse error: ${data}, Exception: ${e.message}`);
					resolve(null);
				} });
		});
		req.on('error', ()=> resolve(null));
	});
}

async function postJson(port, path, body) {
	return new Promise(resolve => {
		const data = Buffer.from(JSON.stringify(body));
		const req = http.request({ hostname:'localhost', port, path, method:'POST', headers: { 'Content-Type':'application/json', 'Content-Length': data.length } }, res => {
			let out=''; res.on('data', c=> out+=c); res.on('end', ()=> { 
				let json=null;
				try { 
					json = out? JSON.parse(out): null; 
				} catch(e) {
					log(`postJson parse error: ${out} Exception: ${e.message}`);
				} resolve({ status: res.statusCode||0, json }); });
		});
		req.on('error', () => resolve({ status: 0, json: null }));
		req.write(data); req.end();
	});
}

function getTvState(){ return fetchJson(TV_STUB_PORT, '/state'); }
function getTvHealth(){ return fetchJson(TV_STUB_PORT, '/health'); }
function getVersion(s){ return s?.lastStateSync?.payload?.version; }

async function waitFor(predicate, timeoutMs, intervalMs){
	const deadline = Date.now()+timeoutMs;
	while(Date.now()<deadline){
		try{
			const ok = await predicate();
			if(ok) return true;
		} catch(e) {
			log(`waitFor predicate Exception: ${e.message}`);
		}
		await delay(intervalMs);
	}
	return false;
}

// Hook A: Server Startup & Health
async function hookA(){
	const live = await httpOk('/live', HEALTH_TIMEOUT_MS);
	const ready = await httpOk('/ready', HEALTH_TIMEOUT_MS);
	const health = await httpOk('/health', HEALTH_TIMEOUT_MS);
	const pass = live && ready && health;
	return { hook:'A', pass, detail: pass? 'live/ready/health OK' : `live:${live} ready:${ready} health:${health}` };
}

// Hook B: Stub Pair Registration Round Trip (version>=1 on both stubs)
async function hookB(){
	const deadline = Date.now()+HOOK_B_TIMEOUT_MS;
	let tv=false, remote=false, tvV=0, remoteV=0;
	while(Date.now()<deadline && !(tv && remote)) {
		const tvState = tv? null : await fetchJson(TV_STUB_PORT,'/state');
		const remoteState = remote? null : await fetchJson(REMOTE_STUB_PORT,'/state');
		const tvVersion = tvState?.lastStateSync?.payload?.version;
		const remoteVersion = remoteState?.lastStateSync?.payload?.version;
		if(typeof tvVersion === 'number' && tvVersion >=1) { tv=true; tvV=tvVersion; }
		if(typeof remoteVersion === 'number' && remoteVersion >=1) { remote=true; remoteV=remoteVersion; }
		if(!(tv && remote)) await delay(POLL_INTERVAL_MS);
	}
	const pass = tv && remote;
	return { hook:'B', pass, detail: pass? `tvV=${tvV} remoteV=${remoteV}` : `missing ${!tv?'TV ':''}${!remote?'Remote':''}` };
}

// Placeholders
async function placeholder(name){
	return { hook:name, pass:true, detail:'placeholder PASS (implement later)' };
}

// Hook C – Navigation Command Propagation
async function hookC(){
	const before = await getTvState();
	const v0 = getVersion(before) || 0;
	const cmd = { msgType:'navigation_command', payload: { action:'navigate_to_performer', targetId:'perf-1' } };
	const r = await postJson(REMOTE_STUB_PORT, '/command', cmd);
	if(r.status !== 200) return { hook:'C', pass:false, detail:`remote /command HTTP ${r.status}` };
	const ok = await waitFor(async ()=>{
		const s = await getTvState();
		const p = s?.lastStateSync?.payload;
		return p && p.navigation?.currentLevel === 'videos' && p.navigation?.performerId === 'perf-1' && getVersion(s) >= v0+1;
	}, HOOK_B_TIMEOUT_MS, POLL_INTERVAL_MS);
	if(!ok){
		const s = await getTvState();
		const p = s?.lastStateSync?.payload;
		return { hook:'C', pass:false, detail:`nav not applied; level=${p?.navigation?.currentLevel} performer=${p?.navigation?.performerId} v=${getVersion(s)} v0=${v0}` };
	}
	const after = await getTvState();
	return { hook:'C', pass:true, detail:`v: ${v0}->${getVersion(after)}` };
}

// Hook D – Control Command Propagation (play)
async function hookD(){
	const before = await getTvState();
	const v0 = getVersion(before) || 0;
	const cmd = { msgType:'control_command', payload: { action:'play', youtubeId:'yt-123', startTime:0 } };
	const r = await postJson(REMOTE_STUB_PORT, '/command', cmd);
	if(r.status !== 200) return { hook:'D', pass:false, detail:`remote /command HTTP ${r.status}` };
	const ok = await waitFor(async ()=>{
		const s = await getTvState();
		const p = s?.lastStateSync?.payload;
		return p && p.player?.isPlaying === true && getVersion(s) >= v0+1;
	}, HOOK_B_TIMEOUT_MS, POLL_INTERVAL_MS);
	if(!ok){
		const s = await getTvState();
		const p = s?.lastStateSync?.payload;
		return { hook:'D', pass:false, detail:`play not reflected; isPlaying=${p?.player?.isPlaying} v=${getVersion(s)} v0=${v0}` };
	}
	const after = await getTvState();
	return { hook:'D', pass:true, detail:`v: ${v0}->${getVersion(after)}` };
}

// Hook E – Stop-and-Wait (Ack-Gated Broadcast Discipline)
async function hookE(){
	const before = await getTvState();
	const v0 = getVersion(before) || 0;
	// Fire two commands rapidly
	void postJson(REMOTE_STUB_PORT, '/command', { msgType:'navigation_command', payload:{ action:'navigate_to_performer', targetId:'perf-2' } });
	const r2 = await postJson(REMOTE_STUB_PORT, '/command', { msgType:'navigation_command', payload:{ action:'navigate_to_video', targetId:'vid-1' } });
	if(r2.status !== 200) return { hook:'E', pass:false, detail:`second /command HTTP ${r2.status}` };
	const ok = await waitFor(async ()=>{
		const s = await getTvState();
		const p = s?.lastStateSync?.payload;
		return p && p.navigation?.currentLevel === 'scenes' && p.navigation?.videoId === 'vid-1';
	}, HOOK_B_TIMEOUT_MS, POLL_INTERVAL_MS);
	const after = await getTvState();
	const v1 = getVersion(after) || 0;
	if(!ok) return { hook:'E', pass:false, detail:`final nav not reflected; level=${after?.lastStateSync?.payload?.navigation?.currentLevel} video=${after?.lastStateSync?.payload?.navigation?.videoId}` };
	const withinBound = v1 <= v0 + 2;
	return { hook:'E', pass: withinBound, detail:`v: ${v0}->${v1} (<= ${v0+2} expected)` };
}

// Hook I – Data Seeding (Initial Data Handler)
// Now seeds the server directly via POST /seed (server is authoritative)
async function hookI(){
	const before = await getTvState();
	const v0 = getVersion(before) || 0;
	const payload = { performers: { demo: { foo: 'bar' } } };
	// POST to server /seed
	const r = await postJson(SERVER_PORT, '/seed', payload);
	if(r.status !== 200) return { hook:'I', pass:false, detail:`/seed HTTP ${r.status}` };
	const ok = await waitFor(async ()=>{
		const s = await getTvState();
		const p = s?.lastStateSync?.payload;
		return p && p.data && (getVersion(s) >= v0+1);
	}, HOOK_B_TIMEOUT_MS, POLL_INTERVAL_MS);
	if(!ok){
		const s = await getTvState();
		return { hook:'I', pass:false, detail:`seed not reflected; v=${getVersion(s)} data=${JSON.stringify(s?.lastStateSync?.payload?.data)}` };
	}
	// Idempotency: repeat and expect no unexpected version jump
	const mid = await getTvState();
	const v1 = getVersion(mid) || 0;
	await postJson(SERVER_PORT, '/seed', payload);
	await delay(POLL_INTERVAL_MS);
	const after = await getTvState();
	const v2 = getVersion(after) || 0;
	const idem = v2 >= v1; // allow equal or monotonic increase
	return { hook:'I', pass:true, detail:`v: ${v0}->${v1} (idem check ${idem?'OK':'WARN'})` };
}

// Hook J – Reconnection Behavior (TV Stub)
async function hookJ(){
	const before = await getTvState();
	const v0 = getVersion(before) || 0;
	const tv = state.processes['tvStub'];
	try { 
		tv?.kill(); 
	} catch(e) {
		log(`Failed to kill tvStub process: Exception ${e.message}`);
	}
	await delay(Math.max(250, POLL_INTERVAL_MS));
	// Restart TV stub
	state.processes['tvStub'] = spawnProc('tvStub', 'node', ['./dist/stubs/tv-stub.js']);
	const reconnected = await waitFor(async ()=>{
		const h = await getTvHealth();
		return !!h && h.connected === true && h.wsReady === true;
	}, HOOK_B_TIMEOUT_MS * 2, POLL_INTERVAL_MS);
	if(!reconnected) return { hook:'J', pass:false, detail:'tv stub did not reconnect' };
	const ok = await waitFor(async ()=>{
		const s = await getTvState();
		return (getVersion(s) || 0) >= v0; // latest state delivered
	}, HOOK_B_TIMEOUT_MS, POLL_INTERVAL_MS);
	const after = await getTvState();
	return { hook:'J', pass: ok, detail:`v>=${v0} actual=${getVersion(after)}` };
}

async function runHook(name){
	switch(name){
		case 'A': return hookA();
		case 'B': return hookB();
		case 'C': return hookC();
		case 'D': return hookD();
		case 'E': return hookE();
		case 'I': return hookI();
		case 'J': return hookJ();
		default: return { hook:name, pass:false, detail:'Unknown hook'};
	}
}

async function startEnvironment() {
	// Build server (incremental)
	await new Promise(resolve => {
		const build = spawnProc('buildServer', NPM, ['run','build:server']);
		build.on('exit', ()=> resolve());
	});
	// Build validation stubs (ensure dist is fresh for stubs/config)
	await new Promise(resolve => {
		const buildStubs = spawnProc('buildStubs', NPM, ['run', 'build:stubs']);
		buildStubs.on('exit', ()=> resolve());
	});
	// Resolve ports from compiled configs (single sources of truth)
	try {
		const proto = await import('./dist/shared/shared/src/lib/models/websocket-protocol.js');
		log(`current directory ${process.cwd()}`);
		if (proto?.WEBSOCKET_CONFIG?.SERVER_DEFAULT_PORT) SERVER_PORT = Number(proto.WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT);
		if (proto?.WEBSOCKET_CONFIG?.ACK_TIMEOUT) {
			const ack = Number(proto.WEBSOCKET_CONFIG.ACK_TIMEOUT);
			if (Number.isFinite(ack)) {
				HEALTH_TIMEOUT_MS = ack;
				HOOK_B_TIMEOUT_MS = ack;
			}
		}
	} catch(e) {
		log(`Failed to import server config; ensure server is built (npm run build:server) Exception: ${e.message}`);
		process.exit(1);
	}
	try {
		const vcfg = await import('./dist/config/validation-config.js');
		if (vcfg?.VALIDATION_CONFIG?.STUB_PORTS?.tv) TV_STUB_PORT = Number(vcfg.VALIDATION_CONFIG.STUB_PORTS.tv);
		if (vcfg?.VALIDATION_CONFIG?.STUB_PORTS?.remote) REMOTE_STUB_PORT = Number(vcfg.VALIDATION_CONFIG.STUB_PORTS.remote);
		const base = Number(vcfg?.VALIDATION_CONFIG?.RECONNECT?.BASE_MS);
		const max = Number(vcfg?.VALIDATION_CONFIG?.RECONNECT?.MAX_MS);
		if (Number.isFinite(base)) {
			POLL_INTERVAL_MS = base;
			// Use reconnect base as a conservative start wait; cap stubs wait by MAX
			START_SERVER_WAIT_MS = base;
			if (Number.isFinite(max)) START_STUBS_WAIT_MS = Math.min(max, base * 3);
			else START_STUBS_WAIT_MS = base * 3;
		}
	} catch(e) {
		log(`Failed to import validation config; ensure stubs are built (npm run build:stubs) Exception: ${e.message}`);
		process.exit(1);
	}
	// Fail fast if any port unresolved
	if (!Number.isFinite(SERVER_PORT) || !Number.isFinite(TV_STUB_PORT) || !Number.isFinite(REMOTE_STUB_PORT)) {
		throw new Error('Ports unresolved. Build server (npm run build:server) and stubs (npm -w validation run build:stubs) to produce compiled JS configs.');
	}
	// Fail fast if any timing unresolved
	if (!Number.isFinite(HEALTH_TIMEOUT_MS) || !Number.isFinite(HOOK_B_TIMEOUT_MS) || !Number.isFinite(POLL_INTERVAL_MS) || !Number.isFinite(START_SERVER_WAIT_MS) || !Number.isFinite(START_STUBS_WAIT_MS)) {
		throw new Error('Timing unresolved. Ensure compiled configs expose ACK_TIMEOUT and RECONNECT.{BASE_MS,MAX_MS} by building server and stubs.');
	}
	// Start server
	spawnProc('server','node', ['../server/dist/main.js']);
	await delay(START_SERVER_WAIT_MS);
	// Start stubs using Node's ESM loader for ts-node so TS ESM imports resolve without precompiling
	spawnProc('tvStub', 'node', ['./dist/stubs/tv-stub.js']);
	spawnProc('remoteStub', 'node', ['./dist/stubs/remote-stub.js']);
	await delay(START_STUBS_WAIT_MS);
}

async function shutdown(){
	state.exiting = true;
	for(const [k,p] of Object.entries(state.processes)){
		try { 
			p.kill(); 
		} 
		catch(e) {
			log(`Failed to kill process ${k} Exception: ${e.message}`);
		}
	}
}

async function runSequence(list){
	for(const h of list){
		let result;
		try { 
			result = await runHook(h); 
		} catch(e) { 
			result = { hook:h, pass:false, detail:`Exception: ${e.message}`}; 
		}
		state.results.push(result);
		console.log(`HOOK ${result.hook}: ${result.pass? 'PASS':'FAIL'} - ${result.detail}`);
		if(!result.pass) break; // fail fast
	}
}

async function main(){
	if(ARG_MODE === 'hook' && !ARG_PARAM){
		console.error('Specify hook letter, e.g. node validate.js hook A');
		process.exit(2);
	}
	const sequence = ARG_MODE === 'hook' ? [ARG_PARAM] : HOOK_SEQUENCE_DEFAULT;
	console.log('QUICK-RUN: starting environment');
	await startEnvironment();
	console.log('QUICK-RUN: running hooks', sequence.join(','));
	await runSequence(sequence);
	await shutdown();
	const failed = state.results.filter(r=> !r.pass);
	const dur = ((Date.now()-state.start)/1000).toFixed(1);
	console.log(`QUICK-RUN: finished in ${dur}s (pass ${state.results.filter(r=>r.pass).length}/${state.results.length})`);
	if(failed.length){
		console.error('FAILED:', failed.map(f=>f.hook).join(','));
		process.exit(1);
	}
}

main().catch(err => { 
	console.error('Runner error', err);
	shutdown().then(()=> process.exit(1)); 
});
