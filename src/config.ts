import { getConfig } from 'doge-config';

export = getConfig('user-service-manager', {
	port: Math.round(Math.random() * 10000) + 10000,
});
