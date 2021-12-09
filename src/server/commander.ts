import { Socket } from 'socket.io';
import { get_context } from './context';
import Task from './task';
import context_t from '../context';
import { createTask, get_task, running_tasks } from './tasks';

const selectedTask = new WeakMap<Socket, Task>();
const taskRecentUser = new WeakMap<Task, Socket>();

const socketStdoutListeners = new WeakMap<Socket, (buffer: Buffer) => void>();
const socketStderrListeners = new WeakMap<Socket, (buffer: Buffer) => void>();

const sessionCallback = new WeakMap<Socket, (cmd: string) => void>();

export function getSelectedTask(socket: Socket) {
	return selectedTask.get(socket);
}

export function setTask(socket: Socket, task: Task) {
	const ctx = get_context(socket);
	const current_task = selectedTask.get(socket);
	if (current_task) {
		const stdout_listener = socketStdoutListeners.get(socket);
		const stderr_listener = socketStderrListeners.get(socket);
		stdout_listener && task.removeListener('stdout', stdout_listener);
		stderr_listener && task.removeListener('stderr', stderr_listener);
		if (taskRecentUser.get(current_task) === socket) {
			taskRecentUser.delete(current_task);
		}
	}
	function cleanup() {
		stdout_listener && task.removeListener('stdout', stdout_listener);
		stderr_listener && task.removeListener('stderr', stderr_listener);
		if (taskRecentUser.get(task) === socket) {
			taskRecentUser.delete(task);
		}
		selectedTask.delete(socket);
		if (ctx.mode === context_t.task) {
			ctx.mode = context_t.done;
		}
	}
	function stdout_listener(buffer: Buffer) {
		if (socket.connected) {
			socket.emit('message', buffer);
		} else {
			cleanup();
		}
	}
	function stderr_listener(buffer: Buffer) {
		if (socket.connected) {
			socket.emit('message', buffer);
		} else {
			cleanup();
		}
	}
	taskRecentUser.set(task, socket);
	selectedTask.set(socket, task);
	ctx.mode = context_t.task;
	task.on('stdout', stdout_listener);
	task.on('stderr', stderr_listener);
	socketStdoutListeners.set(socket, stdout_listener);
	socketStderrListeners.set(socket, stderr_listener);
}

export async function evaluateCommand(socket: Socket, command: string) {
	const cb = sessionCallback.get(socket);
	if (cb) {
		sessionCallback.delete(socket);
		return cb(command);
	}
	const args = command.split(/ /g);
	command = args.shift() || command;
	switch (command) {
		case 'mode':
			const ctx = get_context(socket);
			const mode = (context_t as any)[args.shift() || ''];
			mode && (ctx.mode = mode);
			return !!mode;
		case 'task':
		case 'tasks': {
			const subcmd = args.shift() || 'help';
			switch (subcmd) {
				case 'help': {
					[
						'tasks list - list all tasks',
						'task <name> - manage task',
						'task create - create a task',
					].forEach((m) => socket.emit('message', m));
					return;
				}
				case 'list': {
					for (const task of running_tasks) {
						socket.emit(
							'message',
							`${task.name} - ${
								task.running ? 'running' : 'stopped'
							}`
						);
					}
					return;
				}
				case 'create': {
					socket.emit('message', 'Please name your task:');
					sessionCallback.set(socket, (name: string) => {
						socket.emit('message', 'What command to run?');
						sessionCallback.set(socket, (command: string) => {
							socket.emit(
								'message',
								'Restart automatically? (y/n) =no'
							);
							sessionCallback.set(socket, (restart: string) => {
								socket.emit(
									'message',
									'Be persistant? (y/n) =no'
								);
								sessionCallback.set(
									socket,
									(persistant: string) => {
										const task = createTask(
											name,
											command,
											restart[0]?.toLowerCase() === 'y',
											persistant[0]?.toLowerCase() === 'y'
										);
										setTask(socket, task);
									}
								);
							});
						});
					});
					return;
				}
				default: {
					const task = get_task(subcmd);
					if (task) {
						setTask(socket, task);
					} else {
						socket.emit(
							'message',
							'Task not found! try "tasks list"'
						);
					}
					return;
				}
			}
		}
		case 'quit':
		case 'exit': {
			const current_task = getSelectedTask(socket);
			current_task && taskRecentUser.delete(current_task);
			socket.emit('message', 'Goodbye!');
			socket.emit('terminate');
			socket.emit('pong');
			return setTimeout(() => socket.disconnect(), 30);
		}
		case 'help': {
			[
				'help - show this message',
				'mode <mode> - change execution context',
				'task <arguments> - manage tasks',
				'echo <text> - returns the text back to you',
				'quit - exit the program',
			].forEach((m) => socket.emit('message', m));
			return;
		}
		case 'echo':
			return socket.emit('message', args.join(' '));
		default: {
			return socket.emit(
				'message',
				`Unknown command: "${command}", try "help" for a list of commands.`
			);
		}
	}
}
