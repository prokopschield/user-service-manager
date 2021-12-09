import http from 'http';
import { Server } from 'socket.io';

import httpserver from './http';

const io = new Server(httpserver);

export = io;
