import prompts from 'prompts';
import io from './io';
import config from '../config';
import { decode, hash, verify } from 'doge-passwd';

async function main() {
	let logged_in = false;
	io.on('message', (msg: string | Buffer) => {
		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		console.log(msg);
	});
	let context = '$';
	io.on('context', (c) => (context = c));
	let terminate = false;
	io.on('terminate', () => (terminate = true));
	io.emit('get_salt', async (salt: string) => {
		while (!logged_in) {
			const { password } = await prompts({
				type: 'password',
				name: 'password',
				message: 'Enter the password: ',
			});
			const t = hash(password, 64, salt ? decode(salt) : undefined);
			const hashed = config.obj.auth.str.password;
			if (!hashed || hashed == password || verify(t, hashed)) {
				logged_in = await new Promise((resolve) =>
					io.emit('login', t, resolve)
				);
			}
			if (!logged_in) {
				console.log('Incorrect password!');
			} else {
				console.log('Logged in!');
			}
		}
		while (io.connected && !terminate) {
			const { command } = await prompts(
				context === 'menu'
					? {
							type: 'select',
							name: 'command',
							message: 'What to do?',
							choices: [
								{
									title: 'Open command prompt',
									value: 'mode cmd',
								},
								{
									title: 'Exit',
									value: 'exit',
								},
							],
					  }
					: {
							type: 'text',
							name: 'command',
							message: context,
					  }
			);
			if (typeof command === 'string') {
				io.emit('command', command);
			} else {
				io.emit('menu');
				await new Promise((resolve) => io.once('context', resolve));
			}
			await new Promise((resolve) => io.emit('ping', resolve));
		}
	});
}

export = main;
