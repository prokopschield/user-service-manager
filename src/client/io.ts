import io from 'socket.io-client';
import config from '../config';

const protocol = (config.obj.con.str.protocol ||= 'ws');
const host = (config.obj.con.str.hostname ||= 'localhost');
const port = config.num.port;

export = io(`${protocol}://${host}:${port}`);
