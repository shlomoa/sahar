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
	log(`spawn ${key}: ${command} ${args.join(' ')}`);
	const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command);
	const proc = spawn(command, args, { cwd: opts.cwd||process.cwd(), env: { ...process.env, ...opts.env }, stdio: DEBUG? 'inherit' : 'pipe', shell: useShell });
	state.processes[key] = proc;
	proc.on('exit', code => { if(!state.exiting) log(`${key} exited with code ${code}`); });
	return proc;
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
			let data=''; res.on('data', c=> data+=c); res.on('end', ()=> { try{ resolve(JSON.parse(data)); } catch { resolve(null); } });
		});
		req.on('error', ()=> resolve(null));
	});
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

async function runHook(name){
	switch(name){
		case 'A': return hookA();
		case 'B': return hookB();
		case 'C':
		case 'D':
		case 'E':
		case 'I':
		case 'J': return placeholder(name);
		default: return { hook:name, pass:false, detail:'Unknown hook'};
	}
}

async function startEnvironment() {
	// Build server (incremental)
	await new Promise(resolve => {
		const build = spawnProc('buildServer', NPM, ['--prefix','../server','run','build']);
		build.on('exit', ()=> resolve());
	});
	// Resolve ports from compiled configs (single sources of truth)
	try {
		const proto = await import('../server/dist/shared/websocket/websocket-protocol.js');
			if (proto?.WEBSOCKET_CONFIG?.SERVER_PORT) SERVER_PORT = Number(proto.WEBSOCKET_CONFIG.SERVER_PORT);
			if (proto?.WEBSOCKET_CONFIG?.ACK_TIMEOUT) {
				const ack = Number(proto.WEBSOCKET_CONFIG.ACK_TIMEOUT);
				if (Number.isFinite(ack)) {
					HEALTH_TIMEOUT_MS = ack;
					HOOK_B_TIMEOUT_MS = ack;
				}
			}
	} catch {}
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
	} catch {}
	// Fail fast if any port unresolved
		if (!Number.isFinite(SERVER_PORT) || !Number.isFinite(TV_STUB_PORT) || !Number.isFinite(REMOTE_STUB_PORT)) {
			throw new Error('Ports unresolved. Build server (npm -w server run build) and stubs (npm -w validation run build:stubs) to produce compiled JS configs.');
		}
		// Fail fast if any timing unresolved
		if (!Number.isFinite(HEALTH_TIMEOUT_MS) || !Number.isFinite(HOOK_B_TIMEOUT_MS) || !Number.isFinite(POLL_INTERVAL_MS) || !Number.isFinite(START_SERVER_WAIT_MS) || !Number.isFinite(START_STUBS_WAIT_MS)) {
			throw new Error('Timing unresolved. Ensure compiled configs expose ACK_TIMEOUT and RECONNECT.{BASE_MS,MAX_MS} by building server and stubs.');
		}
	// Start server
	spawnProc('server','node', ['../server/dist/websocket-server.js']);
		await delay(START_SERVER_WAIT_MS);
	// Start stubs using Node's ESM loader for ts-node so TS ESM imports resolve without precompiling
	spawnProc('tvStub', 'node', ['./dist/stubs/tv-stub.js']);
	spawnProc('remoteStub', 'node', ['./dist/stubs/remote-stub.js']);
		await delay(START_STUBS_WAIT_MS);
}

async function shutdown(){
	state.exiting = true;
	for(const [k,p] of Object.entries(state.processes)){
		try { p.kill(); } catch {}
	}
}

async function runSequence(list){
	for(const h of list){
		let result;
		try { result = await runHook(h); } catch(e){ result = { hook:h, pass:false, detail:`Exception: ${e.message}`}; }
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

main().catch(err => { console.error('Runner error', err); shutdown().then(()=> process.exit(1)); });
