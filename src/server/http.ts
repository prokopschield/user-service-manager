import http from 'http';
import config from '../config';

const server = http.createServer();

server.listen(config.num.port);

export = server;
