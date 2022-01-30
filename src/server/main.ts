import { get_salt, is_logged_in, login } from './auth';
import io from './io';
import context_t from '../context';
import { evaluateCommand, getSelectedTask } from './commander';
import { get_context } from './context';

async function main() {
	io.on('connection', (socket) => {
		const context = get_context(socket);
		socket
			.on('ping', (callback: () => void) => {
				if (!(callback instanceof Function)) {
					return socket.disconnect();
				}
				setTimeout(callback);
			})
			.on('get_salt', (callback: (salt: string) => void) => {
				if (!(callback instanceof Function)) {
					return socket.disconnect();
				}
				callback(get_salt());
			})
			.on(
				'login',
				(
					password: unknown,
					rehash: boolean,
					callback: (success: boolean) => void
				) => {
					if (
						typeof password !== 'string' ||
						typeof rehash !== 'boolean' ||
						!(callback instanceof Function)
					) {
						return socket.disconnect();
					}
					callback(
						login(socket, password, rehash) &&
							(context.mode = context_t.cmd) &&
							true
					);
				}
			)
			.on('menu', () => {
				if (is_logged_in(socket)) {
					context.mode = context_t.menu;
				}
			})
			.on('command', (command: unknown) => {
				if (typeof command !== 'string') {
					return socket.disconnect();
				}
				if (!is_logged_in(socket)) {
					return socket.disconnect();
				}
				switch (context.mode) {
					case context_t.menu: {
					}
					case context_t.cmd: {
						return evaluateCommand(socket, command);
					}
					case context_t.task: {
						const task = getSelectedTask(socket);
						task?.emit('stdin', command + '\n');
					}
				}
			});
	});
}

export = main;
