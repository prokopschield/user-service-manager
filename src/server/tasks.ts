import { ConfigField } from 'doge-config';
import config from '../config';
import Task from './task';

export const persistant_tasks = config.obj.tasks;

export const running_tasks = new Set<Task>();

for (const task_field of persistant_tasks.array) {
	if (task_field instanceof ConfigField) {
		const task = new Task(
			task_field.str.name,
			task_field.str.command,
			task_field.bool.autorestart,
			true,
			task_field
		);
		running_tasks.add(task);
	}
}

export function createTask(
	name: string,
	command: string,
	autorestart: boolean,
	persistant: boolean
) {
	var task: Task;
	if (persistant) {
		const task_field = persistant_tasks.obj[persistant_tasks.array.length];
		task_field.str.name = name;
		task_field.str.command = command;
		task_field.bool.autorestart = autorestart;
		task = new Task(name, command, autorestart, persistant, task_field);
	} else {
		task = new Task(name, command, autorestart);
	}
	running_tasks.add(task);
	return task;
}

export function get_task(name: string) {
	return [...running_tasks].filter((a) => a.name === name).pop();
}
