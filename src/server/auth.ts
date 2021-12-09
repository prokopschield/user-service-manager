import { hash, verify } from 'doge-passwd';
import io from './io';
import config from '../config';
import { Socket } from 'socket.io';

const logged_in = new WeakMap<Socket, boolean>();

export function is_logged_in(socket: Socket): boolean {
	return logged_in.get(socket) || false;
}

export function get_salt(): string {
	return config.obj.auth.str.salt;
}

export function change_password(socket: Socket, password: string): boolean {
	if (is_logged_in(socket)) {
		config.obj.auth.str.salt = password.substr(password.length >> 1);
		config.obj.auth.str.password = hash(password);
		return true;
	} else {
		return false;
	}
}

export function login(socket: Socket, password: string): boolean {
	const hashed = (config.obj.auth.str.password ||=
		'change this #' + hash(hash('')));
	if (verify(password, hashed) || verify(hashed, password)) {
		logged_in.set(socket, true);
		return change_password(socket, password);
	} else {
		return false;
	}
}
