import { Socket } from 'socket.io';
import context_t from '../context';

export class Context {
	protected _mode: context_t = context_t.unauthed;
	protected _socket: Socket;
	constructor(socket: Socket) {
		this._socket = socket;
		contexts.set(socket, this);
	}
	get mode(): context_t {
		return this._mode;
	}
	set mode(ctx: context_t) {
		this._socket.emit('context', context_t[(this._mode = ctx)]);
	}
}

const contexts = new WeakMap<Socket, Context>();

export function get_context(socket: Socket) {
	const ctx = contexts.get(socket);
	if (ctx) {
		return ctx;
	} else {
		return new Context(socket);
	}
}
