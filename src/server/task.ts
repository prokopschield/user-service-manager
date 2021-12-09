import { ChildProcess, exec } from 'child_process';
import { ConfigField } from 'doge-config';
import { EventEmitter } from 'stream';

declare interface Task {
	on(e: 'stdin', cb: (data: Buffer) => void): this;
	on(e: 'stdout', cb: (data: Buffer) => void): this;
	on(e: 'stderr', cb: (data: Buffer) => void): this;
}
class Task extends EventEmitter {
	protected _name: string;
	protected _command: string;
	protected _autorestart: boolean;
	protected _persistant: boolean;
	protected _running = false;
	protected _child?: ChildProcess;
	protected _field?: ConfigField;
	constructor(
		name: string,
		command: string,
		autorestart = false,
		persistant = false,
		field: ConfigField | null = null
	) {
		super();
		this._name = name;
		this._command = command;
		this._autorestart = autorestart;
		this._persistant = persistant;
		field && (this._field = field);
		this.start();
		this.on('stdin', (data) => this._child?.stdin?.write(data));
	}
	start() {
		if (this._running) {
			return;
		}
		this._child = exec(this._command);
		this._child.stdout?.on('data', (data: Buffer) =>
			this.emit('stdout', data)
		);
		this._child.stderr?.on('data', (data: Buffer) =>
			this.emit('stderr', data)
		);
		this._running = true;
	}
	stop() {
		this._child?.kill();
		if (this._child && !this._child.killed) {
			this._running = true;
			setTimeout(() => this.stop());
		} else {
			this._running = false;
		}
	}
	restart() {
		this.stop();
		this.start();
	}
	get name() {
		return this._name;
	}
	set name(val: string) {
		this._name = val;
		this._field?.__set('name', val);
	}
	get command() {
		return this._command;
	}
	set command(val: string) {
		this._command = val;
		this._field?.__set('command', val);
	}
	get autorestart() {
		return this._autorestart;
	}
	set autorestart(val: boolean) {
		this._autorestart = val;
		this._field?.__set('autorestart', val);
	}
	get persistant() {
		return this._persistant;
	}
	get running() {
		return this._running;
	}
}

export = Task;
